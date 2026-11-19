# Task 3 · Material Register queries and API

Read the [developer escalation and approval rules](../standards/agent-escalation-rules.md) before starting. The [assignment index](README.md) links to the other briefs.

**Owner** Query and API agent · **Build target** 45 minutes

**Inputs** Task 1 proxy, API start and pg driver contract, plus Task 2’s `db` and `pool` exports in `src/db/client.ts`, schema and shared enum exports, migrations and seeded fixtures. Read the [database query plan](../project/db-query-implementation-plan.md), [API typing plan](../project/api-typing-plan.md), and [API contract](../project/api-contract-implementation-plan.md). The API plan governs the `src/` paths. Use the [scaffold brief](material-register-scaffold-agent-brief.md) for commands and the handoff’s plant codes, including `4000` for Brisbane.

| Editable files | Responsibility |
| --- | --- |
| `src/shared/materials-list-input.ts` | Export `listMaterialsInputSchema` and its parsed `ListMaterialsInput` type using `z.output`. Import Task 2’s constants. |
| `src/db/queries/{material-where,materials,plants}.ts` | Own shared predicate, count, material page, balances and plant lookup. |
| `src/api/server.ts`, `src/api/trpc/{trpc,router}.ts`, `src/api/trpc/routers/{materials,plants}.ts` | Replace Task 1’s smoke procedure. Mount Express, initialize tRPC, register the two reads, centralize error handling and export `AppRouter` from `router.ts`. |


Own risk-based query and API tests per the testing standard in files separate from Task 2. Coordinate shared tooling and harness updates with Task 1; record focused checks and current `task ci`.

## Contract to implement

- Use a strict Zod object. Trim search, cap it at 200 characters and treat blank as unfiltered. Accept optional `status`, `materialType` and trimmed, nonempty text `plantCode`. Accept shared sort keys and directions. Defaults are `updatedAt`, `desc`, page `1` and page size `25`. Pages are positive integers and page sizes are integers in 1–100. Reject invalid input with `BAD_REQUEST` before reaching the DB operation. An unknown nonempty plant code returns zero matches.
- Build one parameterized predicate. OR the case-insensitive substring checks on material number, description and MPN. Escape literal `%`, `_` and `\`. AND that group with active status/type and correlated positive-quantity `EXISTS` for the selected plant. Q1 counts matching materials. Q2 applies the same predicate with the requested sort plus `materialNumber ASC` for timestamp ties, then limit and offset.
- Q3 runs only for a nonempty page. Fetch every balance of those material numbers, including zeroes, with plant labels. Use a numeric window sum over each material’s complete balance set and the Drizzle string decoder after verifying the raw driver’s numeric result. Group rows without changing Q2 order. With no balances, use `[]` and `"0"`.
- `materials.list` returns `{ rows, total, page, pageSize }` with the API plan’s explicit projection, including `unitOfMeasure`, and nested balances. Let Drizzle and tRPC infer the result. `plants.list` takes no input and returns `{ plantCode, name, city, state }[]` sorted by name then code. Use default tRPC JSON transport. Dates reach the UI as ISO strings, exact decimals as strings and nullable fields as `null`.
- Let procedure errors propagate. Log unexpected failures once in the adapter’s `onError` with procedure path and underlying cause. In tRPC’s shared `errorFormatter`, use `Unable to complete the request.` for `INTERNAL_SERVER_ERROR` and omit the stack. Keep normal validation errors actionable. [tRPC error handling](https://trpc.io/docs/server/error-handling) · [Error formatter](https://trpc.io/docs/server/error-formatting)

## Definition of done

Start the seeded application through `./scripts/compose.sh up --build`. From a second terminal, both calls must return HTTP 200 with tRPC `result.data` through the published UI port. `materials.list` on this view returns 25 rows and at least 76 total. Plant codes are strings and the lookup contains `4000` for Brisbane. Use `curl -i` to observe status or `curl -fsS` to consume the body. [tRPC HTTP protocol](https://trpc.io/docs/rpc)

```sh
base=http://127.0.0.1:8080/api/trpc
curl -fsS "$base/plants.list"
curl -fsS -G "$base/materials.list" --data-urlencode \
  'input={"search":"bearing","status":"Active","materialType":"Spare Part","plantCode":"4000","page":2}'
```

All of the following checks must pass:

| Check | Pass condition |
| --- | --- |
| Independent SQL comparison | Run the SQL in the [reviewer runbook](material-register-reviewer-runbook.md). The HTTP count and sequence of page-2 IDs exactly match SQL. Search `mat-000123`, `deep-groove` and `6205-2rs1` in separate requests and find the fixture each time. Compare literal `%`, `_` and `\` search with a SQL `strpos(lower(column), lower(term))` reference on the three fields. |
| Sort and pagination | Run both sorts in both directions against corresponding SQL order. Include seeded rows that share a timestamp and confirm their order is material number ascending. With the combined filter and `page: 999999`, expect HTTP 200, `rows: []` and the same `total`. Confirm the empty Q2 result skips Q3 with a temporary Drizzle query logger or a debugger. |
| Validation | Send `{ "page": 0 }`, `{ "pageSize": 101 }`, `{ "status": "Bad" }`, `{ "sortBy": "description" }` and `{ "bogus": true }` as separate inputs. Each returns HTTP 400 and `BAD_REQUEST`. Confirm the list operation is bypassed with the same temporary instrumentation. Unknown `plantCode` returns 200 with zero matches. |
| Plant stock semantics | Search `MAT-000123` with `plantCode: "4000"`. Find one row, containing Brisbane `"12.000"`, Melbourne `"28.000"`, and Sydney `"0.000"`, with `"40.000"` total and `"19.95"` price. Repeat using `"2000"` and verify zero matches. |
| Exact decimal path | Use a disposable node-postgres probe inside the API container with `pg.Pool` and the configured `PG*` environment. Query `MAT-000124` balances and `SUM(quantity_on_hand) OVER (PARTITION BY material_number)` directly without casts or application decoders. Check JavaScript `typeof === 'string'` and values `"0.100"`, `"0.200"`, `"0.300"`. Also check raw `unit_price_aud` for `MAT-000123` is `"19.95"`. Repeat on the HTTP JSON and check the fractional row has `unitPriceAud: null` and an ISO string `updatedAt`. |
| Actual query failure | On the disposable Compose project, use the failure probe in the [reviewer runbook](material-register-reviewer-runbook.md). `materials.list` returns HTTP 500, tRPC `INTERNAL_SERVER_ERROR` and the generic message, with no stack or DB details. API logs show a single error for that request with the cause and path. `plants.list` continues to return 200. Restore the DB and repeat the successful request. |
| Build and handoff | `npm run typecheck:api` and `npm run typecheck:ui` both exit 0. Both queries work after rebuild through the proxy. Temporary logging, failure probes and the scaffold procedure are absent from the final API. |

**Return** Changed files, final procedure names and `AppRouter` export path, observed total and page count, raw and HTTP decimal evidence, and pass results for SQL parity, validation and the central error check. Pass the contracts and fixture results to Tasks 4 and 5.
