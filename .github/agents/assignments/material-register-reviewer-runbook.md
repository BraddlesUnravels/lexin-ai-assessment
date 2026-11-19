# Task 5 · Material Register reviewer runbook

Read the [developer escalation and approval rules](../standards/agent-escalation-rules.md) before starting. The [assignment index](README.md) links to the other briefs.

**Owner** Reviewer and documentation agent · **Build target** 30 minutes

**Inputs** The assessment brief, [implementation plan](../project/material-register-implementation-plan.md), [scaffold brief](material-register-scaffold-agent-brief.md), and Tasks 2–4’s observed seed, API and browser checks. The owner edits `README.md` and the actual agent context files used during the build. Rehearse the live change in a disposable branch and coordinate core fixes with the affected file owner.


Own final integrated verification and reviewer-only test files. Coordinate shared harness changes with Task 1 and fixes with the affected owner. Run the complete container exercise on the integrated SHA; distinguish automated and manual results and remove the disposable volume. Fixed example ports must be available and unique when running in parallel.

## Fresh clone and repeat startup

From a fresh clone, with a running Docker-compatible engine such as Colima, the Docker CLI and the Compose plugin available, run the following commands.

```sh
./scripts/compose.sh config
./scripts/compose.sh up --build
```

In a second terminal run `./scripts/compose.sh ps` and `./scripts/compose.sh logs api`. Confirm database health, migrations, successful seed and then the Express listener. Open `http://127.0.0.1:8080/materials` and reload it directly. Lift the verified address into the README. Use `./scripts/compose.sh down` to stop and retain data. Start once more and verify the table counts and fixtures stay stable.

If the default project already has data, use a different project and port for the fresh-volume check and failure probe below. Use a fresh project name for each clean-volume rehearsal, or explicitly clean up the disposable project when finished.

```sh
UI_PORT=8081 ./scripts/compose.sh -p material-register-review up --build -d
UI_PORT=8081 ./scripts/compose.sh -p material-register-review logs api
```

## Fixture and API checks

| Open at the verified UI origin | Expected result |
| --- | --- |
| `/materials?search=bearing&status=Active&materialType=Spare%20Part&plantCode=4000&page=2` | Shows rows 26–50 of the observed count. At least 76 materials and four pages. Page controls and Back work, with the last three page numbers on the final page. |
| `/materials?search=MAT-000123&plantCode=4000` | Active SKF `6205-2RS1`. Tab to the disclosure and open it. Brisbane 12, Melbourne 28, Sydney 0, total 40 EA and $19.95. With `plantCode=2000` the same material is excluded. |
| `/materials?search=MAT-000124` | Fractional stock total 0.3 KG or 0.300 KG and an em dash for price. The HTTP response has exact `"0.100"`, `"0.200"`, `"0.300"` and `unitPriceAud: null`. |
| `/materials?search=bearing&status=Active&materialType=Spare%20Part&plantCode=4000&page=999999` | **Go to first page** replaces the stale page and keeps the search and filters. |

Compare the shared view with independent SQL. The output includes table counts for the repeat check, seed invariants, both stock fixtures, the matched total and the ordered page-2 IDs. For the disposable project, add `-p material-register-review` before `exec` and use its assigned UI port for HTTP comparisons.

```sh
./scripts/compose.sh exec -T db psql -v ON_ERROR_STOP=1 \
  -U material_register -d material_register <<'SQL'
SELECT (SELECT count(*) FROM plants) AS plants,
       (SELECT count(*) FROM materials) AS materials,
       (SELECT count(*) FROM plant_catalogue) AS plant_catalogue;
SELECT material_type, count(*) FROM materials GROUP BY material_type ORDER BY material_type;
SELECT count(*) AS materials_without_balances FROM materials AS m
WHERE NOT EXISTS (SELECT 1 FROM plant_catalogue AS s WHERE s.material_number = m.material_number);
SELECT plant_code, count(*) AS balance_rows,
       round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS percent_of_balance_rows
FROM plant_catalogue GROUP BY plant_code ORDER BY plant_code;
SELECT m.material_number, m.manufacturer_name, m.manufacturer_part_number,
       m.unit_of_measure, m.unit_price_aud, s.plant_code, s.quantity_on_hand,
       sum(s.quantity_on_hand) OVER (PARTITION BY m.material_number) AS total_stock
FROM materials AS m JOIN plant_catalogue AS s USING (material_number)
WHERE m.material_number IN ('MAT-000123', 'MAT-000124')
ORDER BY m.material_number, s.plant_code;
CREATE TEMP VIEW review_bearings AS
SELECT m.material_number, m.updated_at
FROM materials AS m
JOIN plant_catalogue AS s ON s.material_number = m.material_number
WHERE s.plant_code = '4000' AND s.quantity_on_hand > 0
  AND m.status = 'Active' AND m.material_type = 'Spare Part'
  AND (strpos(lower(m.material_number), 'bearing') > 0
       OR strpos(lower(m.description), 'bearing') > 0
       OR strpos(lower(m.manufacturer_part_number), 'bearing') > 0);
SELECT count(*) AS matching_materials FROM review_bearings;
SELECT material_number FROM review_bearings
ORDER BY updated_at DESC, material_number ASC LIMIT 25 OFFSET 25;
SQL
```

## Failure and recovery checks

In a fresh tab, throttle the network and check pending feedback with visible table headers and disabled page navigation. At page 2, type quickly and observe the settled list request using the final term and page 1. Check that clearing keeps the nondefault sort. Search for an absent term to observe **No matching materials**.

In DevTools request blocking, block `*/api/trpc/plants.list*`, then reload a filtered link. The list works with the URL’s active `4000` code and the plant control offers recovery. Unblock and retry. Block `*/api/trpc/materials.list*` and reload. The toolbar and plant options work and the list Retry succeeds after unblocking.

Check the server boundary in the disposable project. The probe renames the balance table temporarily and restores it when the shell block exits. Start from a passing API and leave the default project running separately if needed.

```sh
(
  set -eu
  export UI_PORT=8081
  review_sql() {
    ./scripts/compose.sh -p material-register-review exec -T db \
      psql -v ON_ERROR_STOP=1 -U material_register -d material_register -c "$1"
  }
  review_sql 'ALTER TABLE plant_catalogue RENAME TO plant_catalogue_review_probe'
  trap "review_sql 'ALTER TABLE plant_catalogue_review_probe RENAME TO plant_catalogue'" EXIT
  curl -siG http://127.0.0.1:8081/api/trpc/materials.list --data-urlencode 'input={}'
  curl -si http://127.0.0.1:8081/api/trpc/plants.list
  ./scripts/compose.sh -p material-register-review logs --tail=25 api
)
```

Expect `materials.list` HTTP 500 with tRPC `INTERNAL_SERVER_ERROR`, `Unable to complete the request.`, and no stack or SQL details in the response. Expect one corresponding server log with procedure path and DB cause, and HTTP 200 for `plants.list`. After the block, confirm `materials.list` returns 200 again and the stock fixture still works. Stop the disposable project with `UI_PORT=8081 ./scripts/compose.sh -p material-register-review down`.

## Interview rehearsal

Demo the shared search view, navigate to the last page, and open the Brisbane bearing to show the Sydney zero balance and the all-plant total. Trace `url-state.ts` to `MaterialsPage.tsx`, typed tRPC, Zod, the shared predicate and Q1/Q2/Q3, then back to the DataTable. Explain why view state lives in the URL and why positive local stock qualifies a row whose breakdown still shows every assigned plant.

In a disposable branch add a **Unit** column to `src/ui/features/materials/MaterialTable.tsx` using the existing inferred `unitOfMeasure` field. Run `npm run typecheck:ui`, rebuild and show `EA` and `KG` through the two fixture searches. Trace the value to the API projection. Return to the submission branch after the rehearsal.

## Definition of done

- Fresh clone and clean-volume startup succeed using the README commands. The observed URL, PostgreSQL health, migration → seed → Express order, table counts, repeat startup and matching page-2 SQL/HTTP results are recorded.
- The demo URLs, both fixture outcomes, paging and Back, debounce, clear, loading, empty and stale-page recovery all pass. Both independent browser request failures recover and the server failure probe has the expected response, one matching log and a successful recovery.
- The **Unit** rehearsal builds and shows `EA` and `KG`. The submitted branch is back to the agreed register.
- `README.md` states prerequisites and verified setup and stop commands, design and trade-offs, plausible next improvements and actual AI use and that generated catalogue data and prices are illustrative. Record the actual tools used, what worked and observed corrections. Commit the agent context files used in the build. Fill the items below from observations before the GitHub submission, which is due at least 24 hours before interview.

| Record | Observed value |
| --- | --- |
| Host URL and Compose version | Pending execution |
| Fresh and repeat counts by table | Pending execution |
| Shared-view match total and page count | Pending execution |
| Browser, browser checks and server probe | Pending execution |
| Live-change rehearsal and actual AI use | Pending execution |

**Return** README and context file paths, the recorded results above and any remaining issue. The owner should be able to repeat the walkthrough from those files and the seeded repository.
