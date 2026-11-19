# Material Register implementation plan

**Lexin AI assessment · The Pragmatist**  
**Status** Agreed implementation package. Start with Task 1. The fixtures and runtime checks below are verified during implementation.

## Implementation index

| Source | Governs |
| --- | --- |
| [Assessment brief](3b-takehome-the-pragmatist.docx) | Required stack and behaviour, realistic 5,000-material seed, 3–4 hour build, submission and interview. |
| [Application architecture](material-register-app-architecture.md) | Three services, same-origin proxy, React Router v7 Data Mode and overall stack. |
| [Database schema](db-schema-architecture-plan.md) | Tables, constraints, exact decimal types and fictional seed distribution. |
| [Database queries](db-query-implementation-plan.md) | Search and filter semantics, Q1/Q2/Q3, stable ordering and scale trade-offs. |
| [API typing](api-typing-plan.md) | Browser-safe shared values, Zod input, Drizzle projections, tRPC inference and JSON types. |
| [API contract](api-contract-implementation-plan.md) | Procedure contracts, central errors, `src/` paths and Compose layout. |
| [Seed plan](material-register-seeding-plan.md) | Catalogue mix, plant allocation and deterministic seed requirements. |
| [UI implementation](ui-implementation-plan.md) and `material-register-ui-wireframes.png` | Router and providers, Mantine DataTable, URL history, pagination, stock expansion and feedback. |
| `material-register-planning-handoff(1).md` (separate planning notes) | Previously agreed decisions and planning history. |

The application architecture specifies Data Mode. The detailed query and API plans govern the three-query shape, including the plant join in Q3 after the material page is selected. The API plan governs module paths where the query plan uses illustrative paths. The UI plan and wireframe govern stock placement in the expansion and the pagination layout. Keep the wireframe next to the UI plan under its canonical name when copying those files into another workspace.

Build the read-only register and inline balance expansion first. The brief permits at most one optional extra after the core works. Use risk-based automated tests as the selected optional extra, supplemented by manual browser checks. The inline stock expansion presents the multi-plant register and is not a separate detail or edit route. Submit the GitHub repository at least 24 hours before the interview, either public or private and shared with the assessment team. Keep the agent context files used during the build in the repository.

## Scoped implementation tasks

Assign one implementation agent to each task. Give that agent this plan and the relevant sources above. Use the agreed file boundaries for edits and report the observed completion check, changed files and any open issue at handoff. Each task takes ownership of its listed files from the preceding task. Task 1 owns the root package and Compose files throughout, including follow-up dependency or startup changes. Pass README and AI-use notes through scratchpads to the task 5 owner. Follow the assignment index ownership matrix for shared tooling and tests.

| Order | Owner | Depends on |
| --- | --- | --- |
| 1 | Scaffold and startup agent | Architecture and API plan |
| 2 | Schema and seed agent | Task 1 database service, startup hooks and driver choice |
| 3 | Query and API agent | Task 2 schema, shared values and seed fixtures |
| 4 | Register UI agent | Tasks 1 and 3, current UI plan and wireframe |
| 5 | Reviewer and documentation agent | Core running through Compose |

Use the dependency-aware schedule in the assignment index. The first milestone is a browser request through the UI proxy to the API container, with database readiness visible in Compose.

### 1. Scaffold and startup

- **Files** `package.json`, `package-lock.json`, root TypeScript and Vite configuration, `.dockerignore`, `docker/Dockerfile.{db,api,ui}`, `docker/compose-{db,api,ui}.yml`, the static server configuration and `scripts/compose.sh`. Temporary files under `src/api/` and `src/ui/` transfer to tasks 3 and 4 respectively.
- **Interface** One root npm package with separate API and UI build and typecheck commands. The UI build resolves the server’s types. The API image can access the migrations and execute the DB task’s migration and seed commands from its working directory. Use Compose DNS for `api` and `db`. Publish only the UI port. Put the `/api/trpc` proxy location ahead of the SPA fallback and preserve the procedure path and query string.
- **Done when** `./scripts/compose.sh config` resolves all build contexts, `./scripts/compose.sh up --build` starts the scaffold, a direct `/materials` visit loads the SPA, and a request through `/api/trpc` reaches a temporary API smoke endpoint or procedure. Record the chosen host port, runtime and package versions, driver, tRPC link, and the command names and ownership for the next tasks.

### 2. Schema, migration and deterministic seed

- **Files** `src/shared/material-values.ts`, `src/db/{client,schema,drizzle.config,seed}.ts`, and `src/db/migrations/`. Include an executable migration entry point here if the implementation uses one.
- **Interface** Drizzle exports `materials`, `plants` and `plantCatalogue`, and a database client for the queries. Browser-safe shared constants supply enums, sort keys and defaults. Use exact numeric storage for price and quantity, text identifiers and the composite material–plant key. Generate and review the migration with Drizzle. Seed all three tables in dependency order in a transaction with stable keys, seeded randomness or fixed templates, fixed date inputs and conflict handling that preserves existing rows.
- **Done when** a fresh volume contains 5,000 distinct realistic materials, each with at least one plant catalogue record. Confirm schema constraints reject invalid material type, duplicate material–plant keys and negative stock. Repeat startup or rerun the seed, compare counts across all three tables and confirm the fixture balances and prices below. Record the combined fixture’s actual match count and page count.

### 3. Query and API reads

- **Files** `src/shared/materials-list-input.ts`, `src/db/queries/{material-where,materials,plants}.ts`, `src/api/server.ts`, `src/api/trpc/{trpc,router}.ts`, and `src/api/trpc/routers/{materials,plants}.ts`. Take over the API scaffold entry point.
- **Interface** A strict Zod list schema exposes validated defaults of `page = 1`, `pageSize = 25`, `sortBy = updatedAt` and `sortDirection = desc`. Q1 counts and Q2 pages from the same predicate. The three case-insensitive search fields form one OR group. Active filters intersect that group and plant eligibility uses a correlated positive-stock `EXISTS`. Escape SQL pattern characters in the search string. Q3 fetches every balance for the selected material numbers, including zero balances, and computes stock totals with a PostgreSQL window sum. Use material number ascending to break timestamp ties and preserve Q2 row order in the response.
- **Handoff** `materials.list` returns `{ rows, total, page, pageSize }`. `plants.list` takes no input and returns `{ plantCode, name, city, state }[]`, ordered by name then code. Export `AppRouter` as a type. Read prices, quantities and totals as strings. JSON carries ISO timestamps, nullable fields as `null`, and missing balances as `[]` with a stock total of `"0"`. Unexpected failures are logged once with path and cause and surfaced through tRPC with a generic error and no stack. Validation failures use `BAD_REQUEST`.
- **Done when** both procedures work through the UI proxy. Filtered IDs and count agree with a direct DB check. Test invalid input before SQL, unknown plant, literal wildcard search, both sorts and timestamp ties, and an out-of-range page that preserves `total` and skips the balance query. Verify the selected driver returns the exact decimal values before the Drizzle string decoder and check the serialized HTTP response against the decimal fixture. Exercise one actual query failure through the central tRPC boundary.

### 4. Register UI

- **Files** `src/ui/{index.html,main.tsx,router.tsx}`, `src/ui/trpc/client.tsx`, and `src/ui/features/materials/` including `MaterialsPage.tsx`, `url-state.ts`, `MaterialTable.tsx` and the pagination component. Take over the SPA scaffold entry point. Keep the required Mantine/DataTable style order.
- **Interface** Configure `createBrowserRouter` and `RouterProvider` with the v7 nuqs adapter in the root layout. Replace `/` with `/materials` in history. One browser QueryClient and one typed tRPC client support independent TanStack Query reads from `MaterialsPage`. Use type-only `AppRouter` and browser-safe shared values. Bind grouped URL state to the toolbar, normalize search, debounce the list request by 300 ms and hold it while the search settles. Preserve independent list and plant loading, retry and errors.
- **Interaction** Search, filter, sort and clear replace the URL entry and reset page in the same update. Valid page navigation pushes an entry. Clear preserves sort. Render 25 materials per page, with Previous and Next together above the header on the left and Skip to end, the three-number window, any ellipsis and Skip to start on the right. Use Mantine DataTable and one locally expanded row at a time. Include the stock card, full balance table and unit price in that expansion. Expose an accessible page and sort indicator, a keyboard-operable disclosure and scrollable table at narrow widths.
- **Done when** a copied URL opened in a new tab restores filters, sort and page. Network inspection on a later page confirms search never requests page 1 with the stale term. Changing the view closes the expansion. The paging boundaries, zero-match state, recovery from an out-of-range page and independent plant and list errors behave as specified in the UI plan.

### 5. Reviewer walkthrough and documentation

- **Files** `README.md` and the agent context files used during the build. Coordinate fixes with the relevant task owner. Keep the main register branch aligned with the assessment scope during the live-change rehearsal.
- **Interface** Copy the verified startup commands, host URL and fixture results into a short README. Include decisions and trade-offs, what to improve with more time, and actual AI tool use, including one example of what worked and one correction if observed. Keep the actual agent guidance files used during development.
- **Done when** a fresh clone starts from the README with a clean database, the reviewer checklist passes, and the live change below can be made and explained in a rehearsal. Record unresolved issues and the checks run before sharing the repository.

## Startup contract

| Step | Expected behaviour |
| --- | --- |
| Resolve | `./scripts/compose.sh config` merges DB, API and UI files in that order into project `material-register`. Build contexts resolve from the first Compose file. The wrapper works from any working directory and passes arguments through. |
| Start PostgreSQL | `./scripts/compose.sh up --build` brings up `db` with the named data volume. `pg_isready` must report healthy before the API startup command runs. |
| Apply migrations and seed | The API startup command applies pending Drizzle migrations and then runs the transactional seed. If either command fails, the API process exits with a visible error before listening. |
| Serve the register | Express listens on the container network at the agreed internal port. The UI may start serving assets during setup. The app is ready for review once `/materials` loads and both procedure requests succeed through the same-origin proxy. |
| Repeat | `./scripts/compose.sh down` followed by `./scripts/compose.sh up --build` reuses the named volume. Applied migrations stay applied. The repeat seed preserves existing rows and leaves counts stable. For fresh-start verification, use a disposable Compose project with its own volume. |

The scaffold brief fixes Nginx for the UI, `pg` for Drizzle and tRPC `httpLink` at `/api/trpc`. This keeps proxy configuration explicit and allows each of the two procedures to be blocked independently in the browser during review. Use the scaffold brief baseline and record resolved image tags, package versions and the local port in task 1. Confirm decimal decoding in task 3. [Compose merging](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/) · [Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/) · [Compose down](https://docs.docker.com/reference/cli/docker/compose/down/) · [Nginx proxy configuration](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass) · [node-postgres data types](https://node-postgres.com/features/types) · [tRPC links](https://trpc.io/docs/client/links)

## Seed plant codes

Use the CBD postcode as the text `plantCode` for each of the four seeded plants.

| Plant | `plantCode` | Target share of plant catalogue rows |
| --- | --- | --- |
| Melbourne, VIC | `3000` | ~35% |
| Sydney, NSW | `2000` | ~30% |
| Brisbane, QLD | `4000` | ~25% |
| Perth, WA | `6000` | ~10% |

Use this mapping in the seed, SQL fixtures, API examples, UI labels and shared demo URLs. This mapping supersedes the illustrative codes in earlier source plans and wireframes. Store and pass the codes as text to preserve leading zeroes if the dataset expands. [Sydney](https://auspost.com.au/postcode/sydney-2000) · [Melbourne](https://auspost.com.au/postcode/melbourne-3000) · [Brisbane City](https://auspost.com.au/postcode/brisbane-city-4000) · [Perth](https://auspost.com.au/postcode/perth-6000)

## Demo fixtures for the seed

| Fixture | Seed inputs | Expected result |
| --- | --- | --- |
| Stock expansion | Reserve `MAT-000123` as **Deep-groove ball bearing**, `Active`, `Spare Part`, SKF, MPN `6205-2RS1`, unit `EA`, unit price `19.95`. Set Brisbane (`4000`) to `12`, Melbourne to `28` and Sydney to `0`. Omit the Perth balance. | **In stock at Brisbane** includes the material once. Its expansion shows Brisbane 12, Melbourne 28 and Sydney 0, with total **40 EA** and **$19.95**. The same material under **In stock at Sydney** is excluded. |
| Multi-page view | Seed at least 76 distinct rows matching `bearing` + `Active` + `Spare Part` + positive stock at `4000 · Brisbane`, including `MAT-000123`. Keep the fixture within the 5,000-material catalogue and vary the descriptions and part numbers. | The view spans at least four pages. Open `/materials?search=bearing&status=Active&materialType=Spare%20Part&plantCode=4000&page=2`. It shows rows 26–50 of the deterministic total. Record that total from the implemented seed. The wireframe’s 147 is illustrative. |
| Fractional stock | Reserve `MAT-000124` as a raw material in `KG`, with `0.100` in Brisbane and `0.200` in Melbourne and a null price. | HTTP carries quantities and the numeric sum as exact strings (`"0.100"`, `"0.200"`, `"0.300"` for the declared quantity scale). The expansion shows `0.3 KG` or `0.300 KG` and an em dash for price. |

## Reviewer checklist

| Check | Action and expected result |
| --- | --- |
| Setup and repeatability | From a fresh clone and a fresh volume, follow the README. Confirm migration → seed → API in logs, load `/materials` through the published UI port, and compare the three table counts before and after repeat startup. |
| Search | Search for `mat-000123`, `deep-groove` and `6205-2rs1` separately. Each finds the fixture. Check a literal `%` or `_` against the database results. |
| Combined filters and stock | Use the multi-page view. Verify the matched count and page rows against SQL. Look up `MAT-000123` with Brisbane selected and open it with the keyboard. Check all-plant stock, the zero Sydney balance, and exclusion when Sydney is selected. |
| Sorting and navigation | Toggle Material no. and Last updated in both directions. Move via Next, Previous and numbered pages. Use Skip to end and confirm the final three page numbers and disabled forward controls. Use Skip to start and confirm disabled backward controls. Browser Back restores the previous page and URL state. |
| Share, debounce and clear | Copy a filtered, nondefault sort on a later page to a new tab. Type quickly and watch requests in DevTools. After 300 ms of settling, the next request uses the final term and page 1. Clear search and filters from a later page and verify the sort stays selected. |
| Loading and empty states | Throttle a fresh request and check pending feedback, visible headers and disabled page controls. Search for a term absent from the seed and check **No matching materials**. Open an out-of-range URL with a valid filter and check **Go to first page** keeps the filter. |
| Independent failures | In a fresh tab, block only `plants.list` and verify that a plant code already in the URL still applies and the list works. Clear the block and retry the lookup. Block only `materials.list` and verify the toolbar and plant options stay available while the table offers Retry. Unblock and retry the same view. Separately confirm that a server-side query failure returns a generic tRPC error while the underlying cause is in the API log. |
| Readability and access | At narrow width, use the toolbar and pagination while the table scrolls horizontally. Tab to page, sort and stock controls and check visible focus, active state and labels. |

## Interview rehearsal and README

Run a short demo in this order. Open the shared multi-page view, navigate to the final page and return to the fixture search, expand the Brisbane bearing and show the Sydney zero balance. Walk through `url-state.ts` → `MaterialsPage.tsx` → the typed tRPC procedure → Zod → `buildMaterialWhere()` → Q1/Q2/Q3, then show how DataTable renders the inferred result. Explain the decision to keep shareable view state in the URL and to qualify by local stock while displaying the all-plant balance.

Rehearse adding a **Unit** column to the main table in a disposable branch. Start in `src/ui/features/materials/MaterialTable.tsx` and use the existing inferred `unitOfMeasure` field. Typecheck and load the two fixtures so the reviewer can see `EA` and `KG`. Show where the field comes from in the Q2 projection and how the type reaches the table. If the interviewer asks for a filter, a manufacturer-name filter is a candidate. Extend the strict Zod input, shared material predicate, nuqs and the toolbar’s clear helper, then verify the matching count, copied URL and reset behaviour.

Start `README.md` with four short sections. **Run locally** gives prerequisites, verified commands, host URL and stop command. **Design and trade-offs** covers the three services, shared predicate and three-query read, and URL-backed table state. **With more time** can point to a measured search improvement or a limitation already recorded in the source plans. **AI use** names the tools actually used, where the agent helped and what was reviewed or corrected before submission.
