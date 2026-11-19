# Developer mode

- **Owner** Final review and documentation, with startup/toolchain ownership reassigned by the Developer.
- **Brief** Follow-up request for deterministic setup, database-only container and local API/UI hot reload.
- **Base** `1cbabf268326718736f378d1915a799a27f6ae15`; separate `agents/developer-mode` branch in the selected worktree. Task 5's candidate branch is preserved.

## Changes and decisions

- Developer explicitly approved the separate branch, isolated developer database and startup/toolchain scope. The all-container reviewer workflow, schema, seed, API and UI contracts stay unchanged.
- `npm run dev` checks Node 24 and Docker, checks installed packages against the lockfile and npm's dependency tree, installs missing/stale dependencies, starts only PostgreSQL, waits for health, runs existing source migrations/seed, and supervises separate Node watch and Vite HMR processes.
- Native Node 24 TypeScript support avoids a new runtime dependency or rebuilding the API on every edit. Vite proxies same-origin tRPC requests to the watched API. Ports are fixed, overridable and fail rather than silently selecting alternatives.
- The Compose project is derived from the checkout's absolute path, isolating its persistent volume from the default demo and other checkouts. PostgreSQL is published only on loopback. Developer mode deliberately sets its own PG connection variables instead of inheriting a potentially unrelated database target.
- Ctrl+C and process failure terminate owned child process groups, including the watcher subprocess. The database is intentionally retained; `npm run dev:db:stop` removes its container/network, not its volume.
- Setup detection tests join the existing Vitest suite; formatting includes the new JavaScript script and Compose validation includes the developer override.
- Lifecycle verification initially exposed incorrect signal exit handling and a redundant signal to a terminated process group on macOS. Explicit signal callbacks and one-time TERM delivery corrected these; a killed watcher also remains tracked until its API subprocess is terminated. Both normal interruption and killed-watcher scenarios were repeated successfully.

## Review and verification

- **Focused checks:** `npx vitest run tests/sanity-check/developer-startup.test.ts` passed four tests (matching installation with absent optional platform packages; missing/stale dependencies; altered/extraneous dependencies; invalid/overlapping startup ports). `npm run lint` and `git diff --check` passed.
- **Cold setup:** a disposable source copy without `node_modules` and an empty volume ran `DEV_DB_PORT=5434 DEV_API_PORT=3001 DEV_UI_PORT=5174 npm run dev`. It automatically installed 361 packages, started one DB container, migrated/seeded, launched separate local API/UI processes and reported Ready at `http://127.0.0.1:5174/materials`. A proxied HTTP request returned `MAT-000123`, EA, price `"19.95"` and total `"40.000"`. Ctrl+C to its supervisor exited 130.
- **Warm setup and retained data:** `npm run dev:setup`, `npm run dev`, `npm run dev:db:stop`, and another `npm run dev:setup` passed in the selected checkout. Warm startup reported matching dependencies without reinstalling. The same volume kept 4 plants, 5,000 materials and 11,938 balances. Proxied `MAT-000124` retained KG, null price and exact `"0.100"` / `"0.200"` balances and `"0.300"` total. Developer project: `material-register-dev-51958a41cd`; default ports 5433 / 3000 / 5173.
- **Actual reload:** a temporary heading edit appeared in the already-open browser at the same filtered URL without navigation (Vite logged HMR). A temporary API route appeared through the Vite proxy after Node logged a restart. Both source edits were reverted and `git diff -- src` was empty. Requests concurrent with the API restart briefly returned proxy errors, as expected while Express restarts; requests recovered afterward.
- **Failure and cleanup:** duplicate startup exited 1 with `Port 3000 is occupied` and left the existing app responsive. Invalid/duplicate port input exited before Docker/setup. An intentionally absent Docker context printed the Docker diagnostic and exited 1. SIGINT exited 130 and released API/UI ports; forcibly killing the watcher exited 1 and also released both ports, including its orphan API subprocess.
- **Isolation:** developer Compose contained only DB and published it on loopback. The pre-existing full-container app on port 8080 remained responsive. The disposable copy, its project and volume were removed. The selected checkout's developer DB was stopped using `npm run dev:db:stop`; its seeded volume is retained. No helper app processes remain.
- **Limitations:** verified on macOS, Node 24.14.1, npm 11.12.1, Docker Engine 29.5.2 and Compose 5.4.0; Linux/WSL not exercised. Existing npm install reports four moderate advisories; no dependency versions were changed.
- Final exact-SHA CI and independent review are pending. No changes have been integrated into `main`.
