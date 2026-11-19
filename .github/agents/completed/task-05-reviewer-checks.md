# Task 5 · Reviewer checks and documentation

- **Owner:** Final review and documentation agent
- **Brief:** [Reviewer runbook](../assignments/material-register-reviewer-runbook.md)
- **Base:** `1a57129c365923df40ce98d0f906ee42def84809`
- **Outcome:** The Task 5 documentation candidate was integrated. This final-review continuation records the portability correction and final verification; exact-SHA CI and independent review are tracked in the shared Task 5 scratchpad.

## Decisions and changes

| Stage | Expectation | Decision and evidence | Impact |
| --- | --- | --- | --- |
| Starting point | Verify integrated UI and upstream decisions before testing. | The clean Task 5 branch initially matched `main` at `b502f809e7d8bd636727c9f04985dec278136d8a`. Read Tasks 2–4 records and shared handoffs; confirmed the UI and fixture/API contracts in the tree. | No application, test, or configuration changes in the candidate. |
| Escalation | A later-page search must not request the stale term on page 1. | On the original base, typing `bear` then `ingxyz` produced `bearing` page 1 before `bearingxyz` page 1. The developer chose to pause for a Task 4 fix. | Task 4 corrected and tested this behavior; independent review approved `1a57129c365923df40ce98d0f906ee42def84809`. |
| Resumption | Verify against the integrated correction. | Rebased the clean Task 5 branch onto `main` at `1a57129c365923df40ce98d0f906ee42def84809`; repeated the fresh-volume exercise, SQL/HTTP parity, browser recovery and debounce, failure probe, and Unit rehearsal. | The original typing sequence now produces only the final `bearingxyz` page-1 request. |
| Documentation | Supply repeatable setup, architecture, trade-offs, improvements and actual AI use. | Added [README.md](../../../README.md); the detailed evidence stays here. Agent records document the accessibility correction, user-directed seed changes and search fix. | Documentation-only candidate; existing application guidance remains in the repository. |
| Portability follow-up | Keep repository configuration usable across checkouts and machines. | At the Developer's direction, moved the shared `rootDir: "./src"` setting into a repository-root `tsconfig.json`, made both project configs extend it, and copied the base config into the API build image. Audited checked-in paths and normalized the sole absolute local checkout path in the Task 1 record. | Shared root-relative config removes duplicated roots while preserving `dist/api/` and `dist/db/` output paths; runtime configs had no machine-specific absolute paths. |

## Fresh startup and repeat

- Fresh local clone of base `1a57129c365923df40ce98d0f906ee42def84809`, Docker Compose 5.4.0, Colima Engine 29.5.2, Node 24.14.1, npm 11.12.1, Go Task 3.54.0.
- `./scripts/compose.sh config --quiet` and `UI_PORT=8081 ./scripts/compose.sh -p material-register-task5-recheck up --build -d` passed with a new project and empty volume. UI: `http://127.0.0.1:8081/materials`. The default configured address is `http://127.0.0.1:8080/materials`; an existing default stack responded HTTP 200.
- Compose showed PostgreSQL healthy before API startup. API logs showed migration → seed (`5000` materials / `11938` balances) → Express listener. UI startup is not API readiness: immediately after repeat startup the proxy briefly returned 502 until migration and seed completed, then both procedures were available.
- Project-scoped `down` without `-v` followed by `up --build -d` reused the volume. Before and after counts were **4 plants / 5,000 materials / 11,938 balances**; both fixture values and balance rows remained unchanged.
- The runbook's SQL also showed 3,000 Spare Part, 1,100 Consumable, 500 Raw Material and 400 Tool rows, no materials without balances, and plant shares 2000: 30%, 3000: 35%, 4000: 25%, 6000: 10%.

## SQL, HTTP and fixture checks

- Runbook SQL and proxied `materials.list` agreed on **567** filtered matches, **23** pages and all 25 ordered page-2 IDs:
  `MAT-001813, MAT-002543, MAT-001812, MAT-002542, MAT-002541, MAT-000715, MAT-001445, MAT-000714, MAT-001443, MAT-002173, MAT-002172, MAT-002902, MAT-002901, MAT-000345, MAT-001075, MAT-001074, MAT-001804, MAT-001803, MAT-002532, MAT-000706, MAT-000705, MAT-001435, MAT-001434, MAT-002164, MAT-002163`.
- `MAT-000123` returned SKF `6205-2RS1`, EA, price `"19.95"`, Brisbane `"12.000"`, Melbourne `"28.000"`, Sydney `"0.000"` and total `"40.000"`. Brisbane qualified; Sydney-only filtering returned zero rows.
- `MAT-000124` returned KG, Brisbane `"0.100"`, Melbourne `"0.200"`, total `"0.300"` and `unitPriceAud: null`. Keyboard expansion displayed the balances, total and em dash price.

## Browser and failure checks

Using the VS Code integrated browser (Electron 43.8.9 / Chromium 150) against the fresh stack:

- Reloading the shared URL restored search, filters and page 2 (`26–50 of 567`). Next and Back restored pages 3 and 2; Skip to end showed 21, 22 and 23; material-number sorting followed by Clear reset filters/page and preserved ascending sort. Both sort directions for material number and last updated were also exercised on the earlier base.
- After a loaded page 2 and a 500 ms settle, typing `bear` then `ingxyz` sent exactly one list request: `bearingxyz`, page 1. Empty feedback appeared. A delayed request showed loading feedback, visible table headers and disabled Next; an out-of-range page recovered to page 1 preserving filters. Keyboard disclosure showed the zero Sydney balance, all-plant total and price.
- Blocking `plants.list` alone left the list and selected `Plant 4000`; Retry restored `4000 · Brisbane`. Blocking `materials.list` alone left plant options available; Retry restored the same list after unblocking.
- The runbook's temporary `plant_catalogue` rename produced `materials.list` HTTP 500, `INTERNAL_SERVER_ERROR` and `Unable to complete the request.` without SQL or stack in the response. `plants.list` remained HTTP 200. One API error log included path `materials.list` and PostgreSQL `42P01`; the trap restored the table and the fixture returned HTTP 200.

## Unit rehearsal and handoff

- In the disposable clone's `task5-unit-rehearsal` branch, added a main-table column using inferred `unitOfMeasure`. After `npm ci` resolved missing local dependencies, `npm run typecheck:ui` and the Compose UI rebuild passed. The fixture rows displayed **EA** and **KG** in the new column. Browser URLs were cache-busted after the UI image changed.
- Removed the disposable clone, branch, Compose project and volume; the selected Task 5 branch remains available. The unrelated default Compose project was left running.
- `npm ci` reported four moderate dependency advisories; the existing UI build emitted a non-blocking chunk-size warning. Exact candidate SHA, final `task ci`, review status and any later results belong in the shared scratchpad.
