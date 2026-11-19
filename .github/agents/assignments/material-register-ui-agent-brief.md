# Task 4 · Material Register UI

Read the [developer escalation and approval rules](../standards/agent-escalation-rules.md) before starting. The [assignment index](README.md) links to the other briefs.

**Owner** Register UI agent · **Build target** 60 minutes

**Inputs** Task 1’s SPA entry files, separate UI typecheck and same-origin proxy. Task 3’s `AppRouter`, HTTP procedure contract and fixture results. Use the approved [UI wireframe](../project/material-register-ui-wireframes.png) with the [UI implementation plan](../project/ui-implementation-plan.md). If staging the image beside the plan, name it `material-register-ui-wireframes.png`. Use the handoff’s `4000 · Brisbane` and the seed’s observed count in the implementation.

| Editable files | Responsibility |
| --- | --- |
| `src/ui/{index.html,main.tsx,router.tsx}` | Replace the scaffold. Create the Data Mode routes and mount Mantine, Query and tRPC providers. Load Mantine core styles before DataTable styles. |
| `src/ui/trpc/client.tsx` | Create one browser `QueryClient`, typed tRPC client and bindings with `httpLink({ url: '/api/trpc' })`. Use the same QueryClient in both providers and a type-only `AppRouter` import. |
| `src/ui/features/materials/{MaterialsPage,MaterialToolbar,MaterialTable,MaterialPagination}.tsx`, `src/ui/features/materials/url-state.ts` | Own grouped URL state, query and pending states, toolbar controls, the table, disclosure and pagination. Place any register-only styles beside these files. |


Own focused URL-state and debounce tests where risk warrants them, and the browser checks below. Coordinate shared tooling and harness changes with Task 1. No fixed test quota applies to presentation components.

## Behaviour to implement

- Use module-scope `createBrowserRouter` with a root layout wrapping `Outlet` in `NuqsAdapter` from `nuqs/adapters/react-router/v7`. The index route replaces `/` with `/materials` in history. Keep reads in `MaterialsPage` using `useQuery` and typed tRPC `queryOptions`. The materials and plant reads start and recover independently. [React Router Data Mode](https://reactrouter.com/7.18.5/start/data/routing) · [nuqs adapters](https://nuqs.dev/docs/adapters) · [tRPC TanStack Query setup](https://trpc.io/docs/client/tanstack-react-query/setup)
- Use the shared constants in one `useQueryStates`. Restore `search`, `status`, `materialType`, `plantCode`, `sortBy`, `sortDirection` and `page`. Trim search for the API, omit blanks, cap input at 200 characters and show an editable validation state for an oversized pasted URL. An absent or invalid enum uses its default. Parse `page` as a strict positive safe integer, otherwise use 1. Treat plant codes as text. An unknown code stays visible and clearable and produces zero matches.
- Search, filter, sort and clear each replace the URL with `page: 1` in one update. Clear removes search and the three filters and keeps sort. Valid page actions push. First selection of Material no. sorts ascending, first selection of Last updated sorts descending, and clicking the active sort reverses it. Use 25 rows per page. Debounce the normalized search by 300 ms and pause the list while the live and debounced terms differ. Keep the table headers in place and disable pagination when the new view has no count. [nuqs history options](https://nuqs.dev/docs/options#history) · [Mantine debounce hook](https://mantine.dev/hooks/use-debounced-value/)
- Follow the wireframe’s toolbar and external pagination row. Directly above the headers, put **Previous**, **Next** on the left and **Skip to end**, one to three page numbers, optional trailing ellipsis, **Skip to start** on the right. Keep three numbers on the final page when available. Compute the window and result range from the successful server result using the UI plan’s rules. Keep the toolbar and pager outside the horizontal table scroll area.
- Use Mantine DataTable with `materialNumber` as its identifier and separate Manufacturer and MPN columns. Render the UI plan’s column order, null em dashes and Australian date format. Use a focusable disclosure chevron with a material-specific label and `aria-expanded`. Open one row at a time, and close it on search, filter, sort or page changes. The nested plant table shows all balances, including zeroes, beside the all-plant total card and AUD price. Preserve exact decimal strings in display formatting. Render the result count beneath the table. [DataTable expansion](https://icflorescu.github.io/mantine-datatable/examples/expanding-rows/)

## Definition of done

Run `npm run typecheck:ui` and `npm run build:ui`. Both exit 0. Start via `./scripts/compose.sh up --build` and check the published app with the actual seeded API. Browser assets contain no API or DB runtime imports. Record the browser, tested width and request evidence for these checks.

| Browser check | Pass condition |
| --- | --- |
| Direct route and sharing | Visiting `/` ends at `/materials` using replacement. Paste `/materials?search=bearing&status=Active&materialType=Spare%20Part&plantCode=4000&sortBy=materialNumber&sortDirection=asc&page=2` into a new tab and hard reload. Controls, sort, page and matching rows restore. tRPC requests use the same origin. |
| Paging and history | Check numbered controls, Previous, Next and both skip actions. Back restores the preceding page and filters. At the start the two backward actions are disabled. At the end the two forward actions are disabled, the final three page numbers remain visible and the ellipsis is gone. Selecting the active page is a no-op. |
| Debounce and clear | From page 2, type a new term quickly and inspect DevTools Network. No list request combines page 1 with the old term. After 300 ms of settling, a request for the final term and page 1 completes. Clear from a filtered later page and verify all four inputs reset in one update, page returns to 1 and the nondefault sort stays selected. |
| Empty and stale page | An absent search term produces **No matching materials**, zero count and disabled navigation. A positive-result URL with `page=999999` offers **Go to first page**. Activating it replaces that entry while preserving search, filters and sort. An unknown plant remains visible and can be cleared. An oversized pasted term can be shortened before the list requests resume. |
| Independent loading and errors | Throttle a fresh uncached list request to observe toolbar, headers and pending feedback with pagination disabled. Block only `plants.list` in a fresh tab. The listing still uses a selected code from the URL and the plant control can retry after unblocking. Repeat with only `materials.list` blocked. Plant options remain available and list Retry reloads the same view. |
| Stock and access | With `MAT-000123` and Brisbane selected, use keyboard to open the disclosure. It shows 12 Brisbane, 28 Melbourne and 0 Sydney, total 40 EA and $19.95. Search `MAT-000124` and confirm exact fractional stock and an em dash for price. Changing the view closes the open row. At a narrow width, verify visible focus, accessible sorting and current page, and that the table scrolls without obscuring the controls. |

**Return** Changed files, local URL and both successful build commands, plus the observed outcomes for every browser check. Pass the verified demo links, recovery steps and any issue still open to Task 5.
