# Material Register

A read-only, multi-plant material register. The generated catalogue and prices
are illustrative, not procurement data.

## Run locally

You need Git, a running Docker-compatible engine, the Docker CLI and the Compose
plugin. The application builds inside containers; Node is not required on the
host to start it.

From the repository root:

```sh
./scripts/compose.sh config
./scripts/compose.sh up --build
```

Open [http://127.0.0.1:8080/materials](http://127.0.0.1:8080/materials).
PostgreSQL must become healthy before the API applies migrations, seeds the
catalogue and starts Express. The UI can appear before the API is ready.
Inspect startup with `./scripts/compose.sh ps` and
`./scripts/compose.sh logs api` in another terminal. Stop the stack with
`./scripts/compose.sh down`; the database volume is retained for the next run.

If port 8080 is occupied, choose a free port, for example:

```sh
UI_PORT=8081 ./scripts/compose.sh -p material-register-review up --build -d
UI_PORT=8081 ./scripts/compose.sh -p material-register-review down
```

Use the same project name and port for subsequent commands. This example serves
`http://127.0.0.1:8081/materials` and retains its separate volume on `down`.
To remove that disposable project's data, use
`UI_PORT=8081 ./scripts/compose.sh -p material-register-review down -v`.

For development checks, install Node 24, npm and Go Task, then run `npm ci`
and `task ci`. CI also requires Docker; its container smoke check uses an
isolated project and volume.

## Developer mode (hot reload)

On macOS, Linux or WSL, install Node 24 with npm and start Docker with Compose.
From the repository root, run:

```sh
npm run dev
```

Open [http://127.0.0.1:5173/materials](http://127.0.0.1:5173/materials) when
the command reports **Ready**. No prior `npm ci` or `.env` file is needed.
Startup checks the installed dependency tree against the lockfile and runs
`npm ci` only if missing or stale. It starts only PostgreSQL in Docker, waits
for health, applies pending migrations and runs the existing conflict-safe seed.
It then starts Express under Node's TypeScript watch mode on port 3000 and
Vite's React hot-reloading server on port 5173, as separate local processes.
Vite proxies `/api/trpc` to Express; API edits restart the API, UI edits hot
reload in the browser. Type checking remains a separate `task ci` check.
After adding a migration or changing dependencies, restart `npm run dev`.
Requests during an API restart can briefly fail; retry after it starts again.

Ctrl+C stops both local processes (also stopped if either process exits).
The database stays running and retains your data. These commands prepare setup
without running the app, or stop the developer database without deleting data:

```sh
npm run dev:setup
npm run dev:db:stop
```

The developer Compose project name is printed on startup and includes a hash
of the checkout's absolute path. Its volume is separate from the all-container
demo and other checkouts; moving a checkout selects a new volume. The database
is reachable only at `127.0.0.1:5433`, using the local-only credentials in
`docker/compose-db.yml`. Developer mode sets PG connection variables itself,
ignoring inherited PG targets; it does not read `.env`.
The existing API binds to all host interfaces, so use a trusted development
machine/network. Vite binds to loopback.

Ports never silently change. If a port is occupied, stop its owner or choose
free ports, using the same overrides on subsequent commands:

```sh
DEV_DB_PORT=5434 DEV_API_PORT=3001 DEV_UI_PORT=5174 npm run dev
DEV_DB_PORT=5434 DEV_API_PORT=3001 DEV_UI_PORT=5174 npm run dev:db:stop
```

## Design and trade-offs

Nginx serves the React UI and proxies same-origin tRPC requests to Express;
PostgreSQL stores the catalogue and plant balances. React Router data mode and
URL-backed filters, sort and pagination make a view shareable. Search waits
300 ms after typing before requesting results.

The API validates inputs with Zod. One shared predicate drives both the count
and ordered page queries; a third query fetches all plant balances for that
page. A plant filter requires positive stock at the selected plant, while the
expansion still shows every assigned plant, including zero balances. PostgreSQL
numeric values are returned as decimal strings to avoid floating-point loss.
Offset pagination and substring search are straightforward for this 5,000-row
demo but should be measured before scaling.

## With more time

Measure search and paging against larger datasets and query plans before
choosing indexes or cursor pagination. Add automated end-to-end browser coverage
for the manual recovery and navigation checks, and investigate splitting the
UI bundle (the production build reports a chunk-size warning).

## AI use

GitHub Copilot agents in VS Code helped plan, implement, test, review and
document the application; the checked-in assignment and completion records
capture their work. Independent review caught inaccessible sortable headers,
which were corrected with native buttons and sort state. During final checking,
an agent reproduced an extra stale search request; the Task 4 fix and focused
regression were reviewed and the browser check was repeated. The developer
provided scope decisions and integrates reviewed changes.
