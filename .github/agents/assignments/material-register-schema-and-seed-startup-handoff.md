# Task 2 · Material Register schema and seed startup handoff

Read the [developer escalation and approval rules](../standards/agent-escalation-rules.md) before starting. The [assignment index](README.md) links to the other briefs.

**Owner** Schema and seed agent · **Build target** 35 minutes

**Inputs** Task 1 [scaffold brief](material-register-scaffold-agent-brief.md), [database schema](../project/db-schema-architecture-plan.md), [seeding plan](../project/material-register-seeding-plan.md), and the fixtures and plant codes in the implementation plan. Use this alongside the [schema and seed agent brief](material-register-schema-and-seed-agent-brief.md). The seed owner spends at most 10 minutes total on catalogue research. No separate sourcing handoff, CSV or family-rules deliverable is required. Use deterministic family templates and illustrative prices, preserving fixtures.

| Editable files | Responsibility |
| --- | --- |
| `src/shared/material-values.ts` | Export browser-safe material type, status, sort key and direction tuples and list defaults for the API and UI. Agree named exports with both downstream owners before handoff. |
| `src/db/{client,schema,drizzle.config,migrate,seed}.ts`, `src/db/migrations/` | Define and export the Drizzle tables and `{ db, pool }`. Replace the scaffold stubs. Own the generated migration and the runtime seed. Put catalogue templates in `src/db/seed-data.ts` if useful. |

## Startup interface

Generate migrations with `npm run db:generate` from the repository root. Commit the SQL and Drizzle migration metadata. Use the node-postgres Drizzle migrator from `src/db/migrate.ts` with `./src/db/migrations`. Both startup scripts compile to `dist/db/` and run from `/app` in the API container. They receive `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` and `PGPASSWORD`, and use the scaffold’s `pg` 8 driver. Close the pool on success and error. Report errors with nonzero exits so Express starts only after a successful migration and seed.

Keep one transaction for the complete deterministic offline seed. Insert plants, materials and balances in dependency order, with fixed keys and dates, targeted conflict handling and exact decimal strings. Preserve existing rows on reruns. Use Melbourne `3000`, Sydney `2000`, Brisbane `4000` and Perth `6000` as text. Reserve `MAT-000123` and `MAT-000124` and ensure at least 76 qualifying records in the combined Brisbane bearing view.

## Definition of done

Run `npm run db:generate` for the initial migration, review the SQL and run `npm run typecheck:api`. Start with a fresh disposable volume using `UI_PORT=8081 ./scripts/compose.sh -p material-register-seed-check up --build -d`. Confirm the database becomes healthy, migrations complete, the seed commits and Express starts in that order. Use the SQL in the [reviewer runbook](material-register-reviewer-runbook.md) with `-p material-register-seed-check` and keep query results as evidence.

| Check | Pass condition |
| --- | --- |
| Schema and exports | Generated SQL creates the three tables, keys, foreign keys, enum columns, non-negative checks and plant lookup index from the schema plan. In disposable transactions, verify that PostgreSQL rejects an invalid material type, duplicate balance pair and negative balance. Hand the actual table, column and shared export names to Tasks 3 and 4. |
| Fresh inventory | Four plants with the agreed postcodes. Exactly 5,000 distinct materials, with 3,000 Spare Parts, 1,100 Consumables, 500 Raw Materials and 400 Tools. Every material has at least one balance record and there are no duplicate material–plant keys. Record observed plant share and representative family samples. Confirm generated identities and illustrative prices are identifiable in seed inputs. |
| Fixtures | In SQL, verify `MAT-000123` has SKF `6205-2RS1`, `19.95`, the 12/28/0 Brisbane, Melbourne and Sydney balances, no Perth assignment and a total of 40. Verify `MAT-000124` has null price, `0.100` in Brisbane and `0.200` in Melbourne, with a sum of `0.300`. The independent combined filter count is at least 76. Record count and `ceil(count / 25)` for the UI and reviewer. |
| Repeat and fail-fast | Run `UI_PORT=8081 ./scripts/compose.sh -p material-register-seed-check exec -T api npm run db:seed`. Counts and fixture values match the fresh run. Check repeat startup with `down` and `up --build -d`. For the fail-fast check, run `UI_PORT=8081 ./scripts/compose.sh -p material-register-seed-check exec -T -e PGHOST=127.0.0.1 api npm run db:seed` and confirm a prompt nonzero exit. The startup `&&` chain stops on that exit. |

**Return** Migration and seed paths, table and shared export names, fresh and repeat counts, plant distribution, fixture SQL results, match total and page count, and the sourcing inputs actually incorporated. Task 3 repeats the exact decimal checks over HTTP. Stop the disposable project with `UI_PORT=8081 ./scripts/compose.sh -p material-register-seed-check down`.
