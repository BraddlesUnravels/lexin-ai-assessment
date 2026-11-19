# Task 1 · Material Register scaffold and startup

- **Owner** Scaffold and startup agent
- **Brief** `.github/agents/assignments/material-register-scaffold-agent-brief.md`
- **Outcome** Pending implementation and verification.

## Changes and decisions

| Stage | Original plan or expectation | Change, deviation, improvisation, or assumption | Reason and evidence | Impact and outcome | Developer decision, if required |
| --- | --- | --- | --- | --- | --- |
| Planning | Use the worktree already created for this session and do not merge into `main`. | The only existing worktree was clean on `main` at `439f5d7714f3408450381ce465dc7599fb7db0f7`; after asking, created `task-1-scaffold-startup` in that same worktree. | `git worktree list --porcelain` showed one worktree; Developer selected “Create a task branch in the existing worktree.” | Worktree remains `/Users/radaskey/code/lexin-ai-assessment`; no additional worktree was created and no changes were made to `main`. | Approved by Developer in this session. |
| Development | Use the scaffold contract and its tested package baseline. | Added pinned root dependencies, API/UI TypeScript projects, Vite, Vitest Node/UI projects, Prettier, ESLint and Taskfile checks; used Vitest 5.1.1 and ESLint 10.15.0 tooling after the initial Vitest release exposed critical development-only advisories. Added the Express smoke router, logged DB stubs, React marker, Compose services, Nginx proxy and disposable smoke harness. | The pinned application package versions were verified on npm. Vitest 5.1.1 supports the pinned Vite 7 and Node 24; `npm audit --omit=dev` reports no production vulnerabilities. | Supplies the startup and toolchain interfaces for Tasks 2–4. Taskfile documents Node 24/npm and Go Task as developer CI requirements and Docker CLI/Compose as the only app-startup requirements. | None. |
| Verification | Direct `/materials` access and the proxy smoke procedure must work through the actual images. | The first image run found Nginx lacked `root /usr/share/nginx/html`; after fixing it, the harness was adjusted to assert the SPA root document rather than a client-rendered React heading in raw HTML. | Nginx logs showed an internal redirect cycle. A subsequent browser page rendered “Material Register scaffold”; the proxied procedure returned HTTP 200 and echoed `via-ui`. | Fixed the Nginx configuration and smoke harness; isolated Compose smoke and default-project same-volume restart both passed. | None. |

## Review and verification

- **Resolved packages** Express 5.3.0, pg 8.23.1, Drizzle ORM 0.45.4/Kit 0.31.11, Zod 4.6.7, tRPC 11.29.5, TanStack Query 5.108.0, React/DOM 19.3.1, React Router 7.18.6, nuqs 2.10.3, Mantine core/hooks 8.3.18, Mantine DataTable 8.3.13, Vite 7.3.8, React plugin 5.2.0 and TypeScript 5.9.3. Test/lint tooling uses Vitest 5.1.1 and ESLint 10.15.0.
- **Docker tags** `node:24-bookworm-slim`, `postgres:17-bookworm`, and `nginx:1.30-alpine` (observed Nginx 1.30.7).
- **Checks** Colima context is active (`colima`, Docker Engine 29.5.2); Docker Compose 5.4.0; Node 24.14.1; npm 11.12.1; Task 3.54.0. `npm ci`, both typechecks, unit tests, formatting, lint, both builds, Compose config, isolated Docker smoke and browser/API checks passed. `task ci` passed on the staged candidate content. The final committed SHA will be rerun and recorded in the scratchpad. `npm audit --omit=dev` found zero vulnerabilities; the complete development tree has four moderate advisories and no high/critical advisories.
- **Review outcomes** Independent review status for the final candidate is recorded in the shared scratchpad.
- **Open items** No known implementation blockers. Record the final SHA, post-commit `task ci` result, and exact review approval in the shared scratchpad.
