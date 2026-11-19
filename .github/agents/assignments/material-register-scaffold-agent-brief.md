# Task 1 · Material Register scaffold and startup

Read the [developer escalation and approval rules](../standards/agent-escalation-rules.md) before starting. The [assignment index](README.md) links to the other briefs.

**Owner** Scaffold and startup agent · **Build target** 35 minutes

**Inputs** [Supplied assessment brief](../project/3b-takehome-the-pragmatist.docx), [application architecture](../project/material-register-app-architecture.md), [API contract](../project/api-contract-implementation-plan.md), and [implementation plan](../project/material-register-implementation-plan.md).

## Files and handoff

| Files | Ownership |
| --- | --- |
| `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.api.json`, `tsconfig.ui.json`, `vite.config.ts`, `.gitignore`, `.dockerignore` | Scaffold owner keeps the root toolchain and must review dependency or command changes from downstream tasks. |
| `docker/Dockerfile.{db,api,ui}`, `docker/compose-{db,api,ui}.yml`, `docker/nginx.conf`, `scripts/compose.sh` | Scaffold owner keeps the container, startup and proxy interfaces. Mark `compose.sh` executable. |
| `src/db/{migrate,seed}.ts`, `src/db/migrations/.gitkeep` | Task 1 supplies temporary no-op entry points that explicitly log scaffold mode and exit successfully. Task 2 replaces both entry points and supplies the migration directory contents. |
| `src/api/server.ts`, `src/api/trpc/router.ts` | Task 1 mounts the temporary tRPC router. Task 3 replaces the smoke router, takes ownership of the server and exports the final `AppRouter` from the same path. |
| `src/ui/index.html`, `src/ui/main.tsx` | Task 1 supplies the temporary React scaffold marker. Task 4 takes both files and adds the permanent routes, providers and register. |

## Shared tooling and tests

Task 1 owns shared test dependencies/configuration, `Taskfile.yml`, shared helpers and `scripts/container-smoke.sh`. Configure Vitest, Prettier, framework-aware ESLint with `@typescript-eslint/no-explicit-any` as an error, and suitable Node and UI test environments. Supply `format:check`, `lint` and `test:unit` npm scripts as well as the build/typecheck scripts below. Add a meaningful scaffold-level test and make `task ci` pass at the scaffold stage. Run unit tests after typechecking. Document Go Task as a developer CI prerequisite; Docker and Compose are sufficient for reviewers running the app.

Provide a smoke harness with isolated project, available port, readiness timeout, failure logs and safe cleanup. Initially check scaffold behavior only. As later agents supply suites and real contracts, update CI and the harness to run all required tests and the final container exercise. Never count future-stage tests as passed. The assignment index defines ownership and the testing standard defines the final gate.

## Runtime decisions

| Layer | Contract |
| --- | --- |
| Build/API runtime | Node 24 LTS, official `node:24-bookworm-slim` for builds and the API runtime. Set npm `engines.node` to `24.x`. |
| Database | Official `postgres:17-bookworm`. Build it through `Dockerfile.db`. Mount the named `pgdata` volume at `/var/lib/postgresql/data`. |
| UI runtime | Official `nginx:1.30-alpine`. Serve the Vite output at `/usr/share/nginx/html`. |
| API dependencies | Express 5, `pg` 8, Drizzle ORM 0.45, Zod 4 and tRPC 11. Use `drizzle-orm/node-postgres` with `pg.Pool` and the default NUMERIC parser. |
| Browser dependencies | React and React DOM 19, React Router 7, nuqs 2, Mantine core/hooks 8, Mantine DataTable 8 and its `clsx` 2 peer. Use TanStack React Query 5 and `@trpc/tanstack-react-query` 11. Keep all three `@trpc/*` packages on the same resolved release, core/hooks on the same Mantine release and React/React DOM paired. |
| Dev dependencies | TypeScript 5.9, Vite 7 and `@vitejs/plugin-react` 5, Drizzle Kit 0.31 and the Node 24, Express 5, pg 8, React 19 and React DOM 19 typings. |
| Transport | `httpLink({ url: '/api/trpc' })` with the default JSON transformer. One procedure per request gives the reviewer independent browser checks for the two reads. |

Install one root package and commit the npm lockfile. Run the build images with `npm ci` and use `npm ci --omit=dev` in the API runtime stage. Record the resolved versions at handoff and use matching peers without overrides. The image tags pin release lines and accept patch updates. [Node LTS schedule](https://nodejs.org/en/about/previous-releases) · [Node image](https://hub.docker.com/_/node) · [Postgres image](https://hub.docker.com/_/postgres) · [Nginx image](https://hub.docker.com/_/nginx) · [Vite 7 Node requirements](https://v7.vite.dev/guide/migration) · [Mantine DataTable 8](https://github.com/icflorescu/mantine-datatable/discussions/724) · [tRPC HTTP link](https://trpc.io/docs/client/links/httpLink)


The planning probe resolved and built with Express `5.3.0`, `pg` `8.23.1`, Drizzle ORM `0.45.4`, Kit `0.31.11`, Zod `4.6.7`, tRPC `11.29.5`, TanStack React Query `5.108.0`, React/DOM `19.3.1`, React Router `7.18.6`, nuqs `2.10.3`, Mantine `8.3.18`, DataTable `8.3.13`, `clsx` `2.1.1`, Vite `7.3.8`, React plugin `5.2.0` and TypeScript `5.9.3`. Typings resolved to `@types/express@5.0.6`, `@types/node@24.19.2`, `@types/pg@8.23.1`, `@types/react@19.3.0` and `@types/react-dom@19.3.0`. Use these exact versions as the tested baseline. The probe passed both TypeScript checks, the Vite build, Drizzle migration generation and the direct Express smoke response. Task 1 runs the Docker builds and same-origin proxy check in the implementation repo.

## Commands and working directories

Run npm commands from the repository root on a Node 24 host. Each Node image stage uses `WORKDIR /app`, the equivalent root in the container. The host needs a running Docker-compatible engine (such as Colima) and Docker CLI with Compose for the reviewer workflow. Docker Desktop is not required.

| npm script | Exact script | Output or purpose |
| --- | --- | --- |
| `typecheck:api` | `tsc -p tsconfig.api.json --noEmit` | Check API, DB and shared modules. |
| `typecheck:ui` | `tsc -p tsconfig.ui.json --noEmit` | Check the SPA and resolve the API type graph. |
| `build:api` | `tsc -p tsconfig.api.json` | Emit runnable JS under `dist/api/`, `dist/db/` and `dist/shared/` from `rootDir: src` and `outDir: dist`. |
| `build:ui` | `vite build --config vite.config.ts` | Set Vite `root` to the absolute `src/ui` path and `build.outDir` to the absolute `dist/ui` path. Keep `base: '/'` and set `emptyOutDir: true` for `dist/ui` only. |
| `db:generate` | `drizzle-kit generate --config=src/db/drizzle.config.ts` | Task 2 adds this config with schema `./src/db/schema.ts` and output `./src/db/migrations`. Commit the generated SQL and metadata. |
| `db:migrate` | `node dist/db/migrate.js` | Runs from `/app` in the API image. Task 2 uses Drizzle's node-postgres migrator against `./src/db/migrations`. |
| `db:seed` | `node dist/db/seed.js` | Runs from `/app` in the API image. Task 2 owns the deterministic transactional seed. |
| `start:api` | `node dist/api/server.js` | Start Express on `0.0.0.0` and `PORT=3000`. |

Use root `type: module`. Put shared TypeScript options, including `rootDir: "./src"`, in the repository-root `tsconfig.json`; have `tsconfig.api.json` and `tsconfig.ui.json` extend it so project-specific paths resolve from the repository root without machine-specific edits. Target `ES2022` and set strict mode, `verbatimModuleSyntax: true` and `skipLibCheck: true` in the shared config. Set the API module and resolution to NodeNext, with `rewriteRelativeImportExtensions: true`. Use explicit `.ts` extensions in the API/DB/shared source for relative imports that reach Node at runtime, so TypeScript emits `.js` imports and Drizzle Kit can read the source schema. Set the UI config to strict ESNext modules and Bundler resolution with `jsx: react-jsx`, `allowImportingTsExtensions: true` and `noEmit: true`. Run each typecheck before the corresponding image build. Copy `dist/` and `src/db/migrations/` into the API runtime image. Use `.dockerignore` to exclude local dependencies, build output and Git metadata. [TypeScript relative import rewriting](https://www.typescriptlang.org/tsconfig/rewriteRelativeImportExtensions.html) · [Drizzle Kit generate](https://orm.drizzle.team/docs/drizzle-kit-generate) · [Drizzle migration options](https://orm.drizzle.team/docs/migrations)

## Compose startup

Use context `..` in all three Compose files, with `dockerfile: docker/Dockerfile.<service>`. Set `name: material-register` in `compose-db.yml`. The wrapper resolves the repo root from its own location and changes to it before it `exec`s `docker compose -f "$root/docker/compose-db.yml" -f "$root/docker/compose-api.yml" -f "$root/docker/compose-ui.yml" "$@"`. Explicit `-p` from the caller can select a disposable project.

| Service | Listener and environment |
| --- | --- |
| `db` | PostgreSQL at `db:5432`. `POSTGRES_DB=material_register`, `POSTGRES_USER=material_register`, `POSTGRES_PASSWORD=material_register_local` are local fixture defaults. The TCP health check runs `pg_isready -h 127.0.0.1 -p 5432 -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"` with `CMD-SHELL`, a two-second interval and timeout, and 30 retries. |
| `api` | Express at `api:3000`. Set `PORT=3000`, `NODE_ENV=production`, `PGHOST=db`, `PGPORT=5432`, `PGDATABASE=material_register`, `PGUSER=material_register`, `PGPASSWORD=material_register_local`. `pg.Pool` consumes the `PG*` settings. Use a 5-second connection timeout so failure checks return promptly. |
| `ui` | Nginx at `ui:80`. Only this service publishes a port, using `127.0.0.1:${UI_PORT:-8080}:80`. The default browser URL is `http://127.0.0.1:8080/materials`. |

Make `api` depend on `db` with `condition: service_healthy`. Launch API with the argument array `["sh", "-ec", "npm run db:migrate && npm run db:seed && exec node dist/api/server.js"]`. Once Task 2 lands, each DB command logs success only after its work completes and closes its pool. An error exits the API container before Express listens. `ui` depends on `api` with `condition: service_started` and can serve assets while setup proceeds. Consider the application ready when the deep link and required procedure requests work. `down` retains `pgdata`. Subsequent startup reuses it, applies only pending migrations and reruns the conflict-safe seed. [Compose merging](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/) · [Compose startup ordering](https://docs.docker.com/compose/how-tos/startup-order/) · [Compose networking](https://docs.docker.com/compose/how-tos/networking/) · [node-postgres environment configuration](https://node-postgres.com/features/connecting)

### Browser-to-Express path

Mount the Express adapter at `/api/trpc`. In Nginx, use a dedicated `location ~ ^/api/trpc(?:/|$)` and forward `proxy_pass $trpc_upstream$request_uri` with `$trpc_upstream` set to `http://api:3000`. Configure `resolver 127.0.0.11 valid=10s ipv6=off` for Compose network DNS. The original path and query reach Express. In `location /`, use `try_files $uri $uri/ /index.html` so direct SPA routes load. [Nginx proxy pass](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass) · [Nginx resolver](https://nginx.org/en/docs/http/ngx_http_core_module.html#resolver)

## Definition of done

All checks must pass on the final scaffold branch head, including task ci and independent approval of that same SHA. Record later-stage tests as not yet applicable. Attach outputs and image tags.

1. Run `npm ci`, the two typechecks and both builds, in that order for each target. All exit 0 and `dist/api/server.js` and `dist/ui/index.html` exist.
2. Run `./scripts/compose.sh config`, plus the wrapper by absolute path from outside the repo. Confirm the three contexts resolve to the same root and only `ui` publishes a port.
3. Run `./scripts/compose.sh up --build`. In a second terminal run `./scripts/compose.sh ps` and `./scripts/compose.sh logs api`. Confirm healthy `db`, migrate stub then seed stub then Express listener. Open `http://127.0.0.1:8080/materials` and hard reload. The SPA should show **Material Register scaffold**.
4. Define a temporary `smoke.check` query with Zod input `{ probe: string }` that returns `{ ok: true, service: 'api', probe }`. In the browser console on `/materials`, run the following check. The echoed value tests the proxied query string. Task 3 removes the temporary procedure and uses the real reads for subsequent smoke checks. [tRPC HTTP protocol](https://trpc.io/docs/rpc)

```js
const response = await fetch('/api/trpc/smoke.check?input=%7B%22probe%22%3A%22via-ui%22%7D');
console.log(response.status, await response.json());
```

Expected HTTP `200` with `{"result":{"data":{"ok":true,"service":"api","probe":"via-ui"}}}`. Run `./scripts/compose.sh down`, bring it back up and confirm the same named volume and a second passing smoke check. Stop again with `down`.

**Return** Changed files, Docker and resolved package versions, both typechecks, and the observed deep-link and smoke results. Hand Task 2 the PostgreSQL environment, startup hooks and migration path above. Task 2 exports `pool` and `db` from `src/db/client.ts` and replaces the stubs. Hand Tasks 3 and 4 the adapter path, proxy URL and entry-point ownership.
