# Material Register testing standard

Use risk-based tests. There is no fixed quota per function or component. Select cases based on impact, complexity, known weaknesses and existing coverage. Prefer observable behavior over implementation details. Test descriptions start with `should `. Add a regression test when justified by an observed failure.

## Ownership and staged checks

- **Task 1 (scaffold):** owns package scripts, test dependencies and configuration, shared test helpers, `Taskfile.yml`, and `scripts/container-smoke.sh`. Configure Vitest, a working unit command and a meaningful scaffold test. Supply a container harness with safe cleanup and independent project/port selection. Initially test only the scaffold; add downstream suite commands as they become runnable. Later agents request shared changes through scratchpads.
- **Task 2 (schema and seed):** owns separate database constraint, migration, seed and repeat-startup tests in `tests/sanity-check/db/`. Use real migrated PostgreSQL. Coordinate shared setup with Task 1.
- **Task 3 (query and API):** owns separate query and API test files, including real PostgreSQL behavior, independent SQL expectations, validation and proxy responses. Coordinate file names with Task 2 and shared harness changes with Task 1.
- **Task 4 (UI):** owns focused URL-state and debounce tests where risk warrants them and records browser evidence. Straightforward presentation components do not each need unit tests.
- **Task 5 (reviewer):** owns reviewer-only cases in `tests/reviewers/`, runs the final integrated checks and reports automated and manual results. Coordinate harness fixes with Task 1 and implementation fixes with the relevant owner.

Each worker runs focused tests and the currently configured `task ci` before handoff. Record future-stage tests as not yet applicable, never as passed. The final integrated CI must include every authored suite and the complete container exercise. A placeholder, skipped or empty task is not evidence of a passing final suite.

## Required automated behavior

Use combined scenarios where appropriate, deterministic fixtures and independently derived expectations.

- On real migrated PostgreSQL, check required fields, allowed type and status enum values, foreign keys, unique material–plant pairs, non-negative price and stock, numeric precision and scale, applicable null and zero values, text identifiers and the declared plant index. Isolate and clean test records.
- Verify fresh migrations and seed yield 5,000 distinct materials, a balance for every material and both reserved fixtures. Repeat startup against the same volume and verify stable table counts and fixture values.
- Exercise case-insensitive search separately for material number, description and MPN, literal `%`, `_` and backslash, combined search/status/type/plant filters, and an unknown plant. Check both sort keys and directions, timestamp ties, matched counts, ordered pages and an out-of-range page. Derive expected results independently of the production predicate.
- For `MAT-000123`, Brisbane qualifies but zero-stock Sydney does not; the result includes Brisbane 12, Melbourne 28 and Sydney 0 and total 40. Verify the `MAT-000124` fractional decimal strings and null price through HTTP.
- Verify representative invalid enum, sort, pagination and unknown inputs return `BAD_REQUEST` before the list operation. Exercise an actual database failure through the central error boundary and verify a generic response and server log.
- Verify a shared filtered URL restores controls, sort and page, and that clearing resets filters and page while preserving sort. Cover the high-risk debounce/page-reset behavior through a focused automated or browser check.

## Final container exercise

After implementation is integrated, Task 5 runs the final `task ci` on the integrated SHA. The scaffold-owned smoke script builds the production-shaped Compose stack with actual Dockerfiles, migrations and seed in a fresh disposable project and volume, fails on assertion or readiness timeout, captures logs on failure, and always cleans up its own stack and volume.

1. Wait for database health, successful migration, seed and API readiness through the published UI origin.
2. Run the database constraints, seed and query suites against that stack's PostgreSQL. Call both API procedures through Nginx; compare combined-filter totals and ordered page IDs with independent SQL.
3. Verify both stock fixtures and exact decimal strings over HTTP. Restart using the same disposable volume and check repeat-startup assertions.
4. In a browser, verify the shared URL, search debounce, clear action, sorting, pagination, stock expansion, loading, empty and error states. Record manual observations separately from automated results.

For parallel worktrees, the caller supplies a unique Compose project name and an available host port, or the harness allocates them. Validate inputs, report port conflicts clearly and never remove another project's volume. Fixed ports in briefs are single-run examples. Document overrides and cleanup.

Review and handoff follow the worktree and iteration standards: clean up experimental branches and selectively squash noisy commits on the agreed base before final CI and independent approval; later changes require a new CI run and review. Record the final SHA, actual results, limitations and pending later-stage checks in the scratchpad.
