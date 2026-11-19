# Material Register UI implementation plan

**Lexin AI assessment · The Pragmatist**  
**Status** Approved screen design. Ready for implementation.

Build the `/materials` register as a React Router v7 **Data Mode** SPA. The assessment requires a readable table, a debounced search across material number, description and manufacturer part number, at least two combinable filters, at least two sortable columns, server-side pagination, shareable URL state, and loading, empty and error states. This plan specifies Mantine DataTable, three visible filters, and expandable plant balances.

## Wireframes

![Two wireframes of the Material Register. The first shows the toolbar, left-aligned Previous and Next, right-aligned skip buttons and page numbers, separate catalogue columns, and an expanded stock row. The second shows the same controls on the final page, with the last three page numbers visible and the final one selected.](material-register-ui-wireframes.png)

The wireframes show representative rows from a 147-material result set. The first has a row open to show its stock details. The register opens with all rows collapsed. Use Brisbane code `4000` and the actual seeded match count when implementing the examples.

## Layout and controls

| Area | Specification |
| --- | --- |
| Toolbar | **Search**, **Status**, **Material type**, **In stock at**, and **Clear search and filters**. Use visible labels and Mantine inputs. Use single-select controls for the three filters. |
| Pagination row | Directly above the table header. Left group is **Previous**, **Next**. Right group is **Skip to end**, numbered pages and trailing ellipsis when applicable, then **Skip to start**. Align the groups to the table’s edges. Wrap as needed at narrow widths and keep the number window together. |
| Main table | Mantine DataTable. Use `materialNumber` as the record identifier. Keep each catalogue field in its own column. Only **Material no.** and **Last updated** are sortable. |
| Expanded row | An inline plant table, a **Total stock across all plants** card for the selected material, and **Unit price (AUD)**. Open via a labelled, keyboard-accessible chevron button. |
| Result count | Below the table. Show a range such as **26–50 of 147 materials**, based on the returned page and total. Use singular wording when the total is one and show **0 materials** on an empty result. |

Use horizontal scrolling for the data table on narrow screens. Keep the filters and pagination usable without scrolling the table sideways. Render the current page and sort direction with a visible indicator and accessible state. Treat the ellipsis as a visual indicator. Buttons at a pagination boundary are visibly and functionally disabled.

### Column mapping

| Heading | Field | Display |
| --- | --- | --- |
| Plant stock details | `materialNumber` | Chevron button with a label such as **Plant stock for MAT-000123** and `aria-expanded`. |
| Material no. | `materialNumber` | Identifier as supplied, including any leading zeroes. Sortable. |
| Description | `description` | Plain text. Allow wrap. |
| Type | `materialType` | Catalogue type. |
| Status | `status` | Catalogue lifecycle status. |
| Manufacturer | `manufacturerName` | Name or em dash when null. |
| MPN | `manufacturerPartNumber` | Part number or em dash when null. |
| Last updated | `updatedAt` | Readable Australian date from the ISO timestamp. Sortable. |

In the expansion, display **Plant**, **On hand**, and **Unit** in separate cells. Use the material’s `unitOfMeasure` for each balance. Display `totalQuantityOnHand` with that unit on the card. Display the API’s `unitPriceAud` with an AUD label and an em dash when null. Keep decimal strings exact through display. A zero-quantity plant balance is a visible row. When `plantBalances` is empty, display **No plant balances** and the API’s zero total.

The selected plant controls eligibility. For example, filtering **In stock at Brisbane** includes a material with **12 EA** in Brisbane and can still show **28 EA** in Melbourne and **0 EA** in Sydney. Its card shows **40 EA**. All balances and totals come from the list response.

Allow one open row at a time. Close it when search, filters, sort or page changes. A refresh of the same view can keep it open while that material stays on the page. Keep expanded-row state local to the table.

## Router and providers

Create one router with `createBrowserRouter` at module scope in `src/ui/router.tsx`. Use a root layout with the React Router v7 nuqs adapter around its outlet. The index route redirects `/` to `/materials` with history replacement. [React Router v7 Data Mode routing](https://reactrouter.com/7.18.5/start/data/routing) · [nuqs React Router v7 adapter](https://nuqs.dev/docs/adapters#react-router-v7)

```tsx
import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7'
import { MaterialsPage } from './features/materials/MaterialsPage'

function RootLayout() {
  return (
    <NuqsAdapter>
      <Outlet />
    </NuqsAdapter>
  )
}

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      { index: true, element: <Navigate to="/materials" replace /> },
      { path: 'materials', Component: MaterialsPage },
    ],
  },
])
```

In `src/ui/main.tsx`, mount `RouterProvider` from `react-router/dom` inside Mantine, `QueryClientProvider` and `TRPCProvider`. In `src/ui/trpc/client.tsx`, create one browser `QueryClient` and one typed tRPC client pointed at `/api/trpc`. Pass the same `QueryClient` to both query and tRPC providers. Import `AppRouter` as a type. [React Router v7 RouterProvider](https://reactrouter.com/7.18.5/api/data-routers/RouterProvider) · [tRPC TanStack Query setup](https://trpc.io/docs/client/tanstack-react-query/setup)

The route mounts the toolbar immediately. `MaterialsPage` owns both register reads through TanStack Query, which handles their independent loading and retry states. Keep the route objects focused on navigation. [React Router v7 data loading](https://reactrouter.com/7.18.5/start/data/data-loading)

## URL and query behaviour

Use one `useQueryStates` definition with the React Router v7 adapter. Reuse the browser-safe enum tuples, sort keys and list defaults in `src/shared/material-values.ts`. Both tRPC procedure calls use the inferred `AppRouter` contract.

| URL key | UI behaviour |
| --- | --- |
| `search` | Bind the input to the URL-backed value. Normalize whitespace for the query and omit a blank term. Limit input to 200 characters. Give a pasted URL whose trimmed search exceeds the API limit a clear validation message and a way to edit or clear the term. |
| `status`, `materialType` | Parse the literal unions from the shared values. An absent or invalid value uses the unfiltered default. |
| `plantCode` | Preserve a nonblank code as text and use the plant lookup for display labels such as **4000 · Brisbane**. A code absent from a successful lookup stays visible and clearable, and the API returns zero matches. |
| `sortBy`, `sortDirection` | Default to `updatedAt` and `desc`. On first click on **Material no.**, use ascending order. Switching to **Last updated** uses newest first. Clicking the active header reverses direction. |
| `page` | Default to 1 when absent or malformed. Accept positive safe integers. Maintain a fixed UI page size of 25. |

Example shared view. `/materials?search=bearing&status=Active&plantCode=4000&page=2`

- **One update per interaction.** Search, filter and sort changes include `page: 1` in the same URL update. Use history replacement for those edits. Numbered page clicks, Previous, Next and both skip actions push an entry that contains the current search, filters, sort and destination page. Browser Back restores the preceding URL. **Previous** on the page moves to the immediately preceding result page within the current view.
- **Debounce the request by 300 ms.** Debounce the normalized search value used by `useQuery`. Disable the list query while the current and debounced terms differ so that updating `page` cannot fetch page 1 with the old term. Treat this settling interval as pending, including when the old query has cached data. The URL restores control state and the client builds the procedure input from parsed values. [nuqs timing and history](https://nuqs.dev/docs/options) · [Grouped URL updates](https://nuqs.dev/docs/batching) · [Mantine debounce hook](https://mantine.dev/hooks/use-debounced-value/) · [TanStack Query pausing](https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries)
- **Clear in one helper.** Call `clearFilters()` from the toolbar and from the empty-state action when search or filters are active. It replaces the current URL entry, clears the four query keys below, resets page to 1, and preserves the selected sort.

```ts
function clearFilters() {
  return setTableState(
    { search: null, status: null, materialType: null, plantCode: null, page: 1 },
    { history: 'replace' },
  )
}
```

Pass the normalized input to `useQuery(trpc.materials.list.queryOptions(input, options))`. Omit unset search and filter fields, and use numeric pagination. Fetch `plants.list` independently, so the list can run while the plant options load. Both procedures use the same-origin route `/api/trpc`. Pass the returned page to DataTable as `records`. Supply controlled sorting and expansion, and render the agreed pagination row externally. The listing response already contains the rows in database sort order. [tRPC query options](https://trpc.io/docs/client/tanstack-react-query/usage) · [Mantine DataTable pagination](https://icflorescu.github.io/mantine-datatable/examples/pagination/) · [Row expansion](https://icflorescu.github.io/mantine-datatable/examples/expanding-rows/)

## Pagination rules

Calculate `pageCount = Math.ceil(total / pageSize)` using the successful list response. The controls use 1-based pages. The result range starts at `(page - 1) * pageSize + 1` and ends at the offset plus the number of visible rows.

- **Previous** goes to `page - 1` and **Skip to start** goes to page 1. Disable both on the first page.
- **Next** goes to `page + 1` and **Skip to end** goes to `pageCount`. Disable both on the final page.
- For up to three pages, show every existing page number. For four or more, show exactly three consecutive numbers. Centre the window on the selected page where possible and shift it inward at either boundary. Show a trailing ellipsis only when the final page number is beyond the window. Selecting the current page is a no-op.
- On zero matches, show no numbers or ellipsis and disable the navigation actions. With one page, show page **1** selected and disable all four navigation actions.

For a valid current page and `pageCount > 0`, let `size = Math.min(3, pageCount)` and `start = Math.max(1, Math.min(page - 1, pageCount - size + 1))`. Render `size` numbers starting at `start`. Show the ellipsis when `start + size - 1 < pageCount`.

| Current page in a six-page result | Visible numbers |
| --- | --- |
| Page 1 | **1** 2 3 … |
| Page 3 | 2 **3** 4 … |
| Page 5 | 4 **5** 6 |
| Page 6 | 4 5 **6** |

## Feedback and recovery

| State | Expected behaviour |
| --- | --- |
| New view loading or search settling | Keep the toolbar and table headers visible. Show pending feedback in the table body and disable page navigation until the new view’s count is known. Use cached rows immediately if they belong to the requested view. |
| Materials request fails | Display a concise list error and **Retry**. Retry the current view with its search, filters, sort and page. |
| Plant options loading or failed | Give the plant control its own loading or retry treatment. The other controls and material listing remain usable. A plant code already in the URL continues to apply and can be cleared. |
| Zero materials match | Show **No matching materials** and reuse **Clear search and filters** when relevant. |
| Saved page exceeds the final page | When the API reports matches but the requested page exceeds `pageCount`, show **Go to first page**. Reset only the page and replace the invalid history entry so reloading or pressing Back does not reintroduce it. |

## Implementation handoffs

| Task | Ownership | Handoff check |
| --- | --- | --- |
| SPA foundation | `src/ui/main.tsx`, `src/ui/router.tsx` and `src/ui/trpc/client.tsx`. Mount the Data Mode router, Mantine and both data providers. Mount the nuqs adapter in the root route layout. Install compatible Mantine/DataTable package versions and apply Mantine styles before DataTable styles. | From Compose, `/` redirects to `/materials`. A direct visit to a copied `/materials` URL loads the SPA, and the relative tRPC path reaches the API. |
| URL and requests | `src/ui/features/materials/url-state.ts` and the route component. Own parsers, reset helper, URL history, request input, debounce and independent plant lookup. | A copied URL restores the view. Typing from page 2 produces no request combining page 1 with the old term. |
| Register UI | `src/ui/features/materials/MaterialTable.tsx` and a small pagination component beside it. Own column rendering, row disclosure, state feedback and the pagination layout. | Complete the table and pagination checks below against inferred API data. |

Match the API plan’s `src/ui/`, `src/shared/` and `src/api/` boundaries. An existing projected field can be added directly to the table. For a new filter, extend the Zod input and reused database predicate, add the nuqs parser and control, and include it in `clearFilters()`. Verify both the returned rows and matched count for that filter.

## Acceptance checks

1. **Search and filters.** Search by material number, description and MPN. Confirm case-insensitive matching and combine search with Status, Material type and In stock at. Verify the counts and that an unknown plant is clearable.
2. **Page changes and history.** Use a result with more than three pages. Exercise numbered pages, Previous, Next and both skip actions. Verify the ellipsis disappears as soon as the last number is visible and that the final page still shows three numbers. Verify both boundary disabled states. Use Browser Back to restore a prior page and its saved filters.
3. **Clear and recover.** On a later page with filters and a non-default sort, clear in one update. Verify the search and filters are blank, the page is 1, and sort is preserved. Follow a saved URL past the last page and verify the recovery keeps its filters.
4. **Details.** Open a material with balances at several plants. Confirm its expanded total stays across all plants when a plant filter is active. Confirm zero balances are visible, missing prices are distinguishable, and expansion works with keyboard input.
5. **Loading and accessibility.** Exercise loading, empty and error states and separately fail the plant lookup. Verify the count, sort indication and selected page are readable and that a narrow screen can access the controls and scroll the table.

## Decisions and alternatives

| Option considered | Trade-off and decision |
| --- | --- |
| Mantine core `Table` | Lightweight and fully explicit. Headers, row expansion and their wiring need more custom code. Selected **Mantine DataTable** for sortable headers and a controlled expansion API. Keep the external pagination row to match the wireframe. [Mantine Table](https://mantine.dev/core/table/) · [DataTable expansion](https://icflorescu.github.io/mantine-datatable/examples/expanding-rows/) |
| TanStack Table or shadcn/ui Data Table | Flexible headless column model and custom styling. Adds controlled-state or styling setup to a fixed-column register. Mantine DataTable fits the chosen Mantine components. [TanStack manual pagination](https://tanstack.com/table/v8/docs/guide/pagination) · [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/base/data-table) |
| Column-header filter popovers | DataTable supplies a popover slot and an active-filter indicator. The application still supplies controls and URL-to-API wiring. The visible toolbar makes combined filters and clearing easier to discover. [DataTable searching and filtering](https://icflorescu.github.io/mantine-datatable/examples/searching-and-filtering/) |
| React Router Declarative Mode | The JSX route tree gives this one-screen SPA a compact setup. Data Mode was chosen because the route-object configuration is easier for the implementer to follow. [React Router v7 modes](https://reactrouter.com/7.18.5/start/modes) |
| Register data loaders | A loader can fetch before a route renders. For the register, it would need to coordinate with the URL-driven debounce and the two independent request states. The register uses its existing TanStack Query reads. [React Router v7 data loading](https://reactrouter.com/7.18.5/start/data/data-loading) |
| `useSearchParams` directly or duplicate local filter state | Direct handling avoids a dependency but requires app-owned parsing, defaults and grouped updates. A second local copy adds synchronization work. nuqs gives the route one typed set of controls and URL state. [React Router search params](https://reactrouter.com/api/hooks/useSearchParams) · [nuqs grouped updates](https://nuqs.dev/docs/batching) |
| Debounce URL writes alone | nuqs still updates hook values immediately, so a client Query can react to each change. Debounce the fetch input and gate it while settling. [nuqs rate limiting](https://nuqs.dev/docs/options) |
| Replace every navigation or push every edit | Replacement makes prior page visits unavailable to Browser Back. Pushing each edit adds history entries during typing and filtering. Push deliberate page navigation and replace search, filter, sort and clear edits. Use Previous and Next for sequential paging on the screen. [nuqs history options](https://nuqs.dev/docs/options#history) |
| Footer pager, toolbar pager, and an explicit **Back to previous** control | Earlier versions placed navigation in the footer or mixed it into the filters. The approved layout groups page navigation directly above the table. Use Previous and Next at the left, the numbered window and skips at the right, and the browser’s history for the prior URL. |
| Shorten the page window at the end | The first wireframe iteration left two numbers visible on the last page. Keeping three when available gives the controls a consistent width and leaves two adjacent earlier pages reachable at the endpoint. |
| Combine Manufacturer and MPN in a cell, or spread plant balances across the main table | A combined cell saves width but makes the two identifiers harder to scan. Plant columns grow with the site list. Give Manufacturer and MPN separate columns and open a nested table for balances. |
| Main-table stock total or a register-wide stock card | A main-table total costs a column. A register-wide stock metric needs a database aggregate over the full result and a rule for mixed units such as EA and KG. The selected per-material card uses the existing all-plant total. |
| Separate material details or editing route | Useful for CRUD, but needs extra procedures and a workflow beyond browsing the catalogue. Surface the read-only stock details from the current list row. |
| Manufacturer-name filter | Useful for reproducing the SKF example exactly. The agreed search matches MPN, material number and description. Manufacturer-name filtering is a candidate for the interview’s live change. |

## Project references

- [Assessment brief](3b-takehome-the-pragmatist.docx).
- [Application architecture](material-register-app-architecture.md) · [Database schema](db-schema-architecture-plan.md) · [Database query plan](db-query-implementation-plan.md)
- [API typing plan](api-typing-plan.md) · [API contract and implementation plan](api-contract-implementation-plan.md)
- [Mantine DataTable setup and style order](https://icflorescu.github.io/mantine-datatable/getting-started/) · [React Router v7 modes](https://reactrouter.com/7.18.5/start/modes) · [nuqs React Router adapter](https://nuqs.dev/docs/adapters)
