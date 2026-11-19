# Task 4 · Material Register UI

- **Owner** Register UI agent
- **Brief** `.github/agents/assignments/material-register-ui-agent-brief.md`
- **Outcome** In progress.

## Changes and decisions

| Stage | Original plan or expectation | Change, deviation, improvisation, or assumption | Reason and evidence | Impact and outcome | Developer decision, if required |
| --- | --- | --- | --- | --- | --- |
| Planning | Use the integrated Task 3 typed API, shared values, and seeded fixtures; follow the UI plan and wireframe. | Started from the existing Task 4 worktree on the exact current `main` SHA `ddfc6cba59a43466406846e5aa193c820f37f751`; the worktree was clean. Read the Task 1–3 records and shared handoffs before editing. | The API handoff confirms `materials.list`, `plants.list`, 25-row pages, Brisbane `4000`, 567 ordinary bearing matches, and exact decimal strings for both stock fixtures. | No API, schema, shared-value, startup, or test-harness changes were needed. | None. |
| Implementation | Use a module-scope React Router Data Mode router and the Task 3 typed API. | Implemented `createBrowserRouter`/`RouterProvider`, URL-backed register controls, independent materials and plants queries, 300 ms search debounce, table sorting/pagination, and one-row plant stock expansion. | The UI brief and implementation plan explicitly specify Data Mode, query ownership in `MaterialsPage`, 25-row pages, and the URL semantics. | The UI uses existing shared values and same-origin `/api/trpc`; no shared contract changes. The root route replaces `/` with `/materials`. | None. |
| Recovery | Keep stale-page and query errors actionable. | Moved actionable stale-page feedback outside the DataTable empty-state layer after browser interaction showed that the table overlay intercepted its click. | The recovery control rendered but did not receive pointer input while placed in the table feedback area. | “Go to first page” now replaces the invalid page and preserves filters and sort. Materials and plant failures remain independent and retryable. | None. |
| Testing | Use risk-based UI URL/debounce tests and all brief browser checks. | Following the Developer’s narrower test direction, added only focused URL-state tests; straightforward state, network and visual behavior was checked in the browser. | Task 4 direction prioritizes URL restoration, debounce/page reset, clear-with-sort, and fragile stock expansion over broad component coverage. | Four focused URL tests cover restoration/defaulting, strict page semantics, normalization, clear reset/preserved sort, and final-page numbering. The browser evidence is recorded below. | Explicitly directed by the Developer in this task. |

## Review and verification

- **Review outcomes** Pending independent review of the final candidate SHA.
- **Checks** Focused URL-state tests (4) passed; `npm run typecheck:ui`, `npm run lint`, `npm run format:check`, `npm run build:ui`, and `git diff --check` passed during implementation. Final `task ci` remains pending on the committed candidate.
- **Browser verification** Against the seeded app at `http://127.0.0.1:8080`, using a 390 × 844 narrow viewport and desktop viewport:
  - `/` redirects to `/materials`; a pasted/reloaded bearing URL restored search, filters, sort, page, and rows. `materials.list` and `plants.list` used the same-origin proxy and returned HTTP 200.
  - Numbered navigation, Next, Previous, Skip to start/end, Back history, final-page window, disabled boundary controls, and clear-from-later-page were exercised. Clear reset the four filters and page while retaining the material-number ascending sort.
  - Search from page 2 requested only the final debounced term on page 1. A 201-character pasted term made no list request; deleting one character resumed the query at 200 characters on page 1 (HTTP 200).
  - Unknown plant `9999` remained visible and returned zero results. No-match results showed zero count and disabled paging. A stale `page=999999` recovery replaced the URL with page 1 and preserved filters and sort.
  - Blocking `plants.list` left the material row available and selected code visible as `Plant 4000`; Retry restored `4000 · Brisbane`. Blocking `materials.list` left plant options available; Retry restored the same view. The only console network errors in this probe were the intentionally aborted requests.
  - Keyboard disclosure showed all three balances for `MAT-000123` (12.000 Brisbane, 28.000 Melbourne, 0.000 Sydney), total 40.000 EA, and AUD 19.95. `MAT-000124` showed exact fractional quantities and an em dash for null price; changing the search closed the expansion.
  - At 390 × 844, filters and pager remained visible, keyboard focus was `:focus-visible` with a blue border, and the DataTable’s inner viewport scrolled horizontally (992 px content in a 346 px viewport). First-select and reverse-sort behavior were also verified.
- **Open items** Run `task ci` on the final candidate and obtain independent approval for that exact SHA. Record the SHA and review result in the shared scratchpad.
