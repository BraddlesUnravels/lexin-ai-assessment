# Material Register schema and seed agent brief

Read the [developer escalation and approval rules](../standards/agent-escalation-rules.md) before starting. The [assignment index](README.md) links to the other briefs.

**Lexin AI assessment · Task 2**  
**Outcome** The API and UI agents inherit a migrated PostgreSQL database with a repeatable 5,000-material catalogue, agreed types and known demo results.

## Inputs and ownership

| Input | Use it for |
| --- | --- |
| [Database schema](../project/db-schema-architecture-plan.md) | Tables, constraints, indexes, decimal precision and stock semantics. |
| [Seeding plan](../project/material-register-seeding-plan.md) | Catalogue theme, counts, plant allocation and demo fixtures. The source data represents a fictional Australian distributor of industrial maintenance parts and workshop supplies. |
| [Implementation plan](../project/material-register-implementation-plan.md) and the Task 1 [scaffold brief](material-register-scaffold-agent-brief.md) | Repository paths, database driver and environment, API image working directory, npm commands and startup order. |
| [API typing plan](../project/api-typing-plan.md) | Browser-safe shared constants, Drizzle output types and decimal and timestamp representations. |
| Catalogue research | The seed owner spends at most 10 minutes total checking a few product families, units and approximate prices. Stop at the limit and use plausible synthetic assumptions for gaps. No separate sourcing agent, ledger or handoff. |

Own `src/shared/material-values.ts`, `src/db/client.ts`, `src/db/schema.ts`, `src/db/drizzle.config.ts`, `src/db/migrations/` and `src/db/seed.ts`. Keep supporting template and reference data beside the seed, using `src/db/seed-data.ts` if separating generation from insertion makes the code easier to read. Own the DB-side migration entry point if called for by the scaffold. The scaffold owner manages `package.json`, the lockfile and Docker startup configuration. The API owner manages `src/db/queries/` and the tRPC procedures.

Start schema and fixture work as soon as scaffold interfaces are available. The seed runs offline. Briefly record sources actually used; generated identities and prices are illustrative. Preserve the SKF fixture and clearly synthetic price. After changing inputs, verify on a fresh volume because the repeat seed preserves existing rows.

Own schema, migration, seed and real-PostgreSQL constraint tests under `tests/sanity-check/db/` per the testing standard. Coordinate shared tooling and harness changes with Task 1. Run focused checks and current `task ci`; Task 5 owns final integrated execution.

## 1. Implement shared values and the Drizzle schema

Export these browser-safe constants from `src/shared/material-values.ts` as literal tuples or a literal object. Use the first two tuples in Drizzle `pgEnum`. Give the API and UI agents the export names.

| Export | Values |
| --- | --- |
| `MATERIAL_TYPES` | `Spare Part`, `Consumable`, `Raw Material`, `Tool` |
| `MATERIAL_STATUSES` | `Active`, `Pending Review`, `Obsolete` |
| `MATERIAL_SORT_KEYS` | `materialNumber`, `updatedAt` |
| `MATERIAL_SORT_DIRECTIONS` | `asc`, `desc` |
| `MATERIAL_LIST_DEFAULTS` | `{ page: 1, pageSize: 25, sortBy: 'updatedAt', sortDirection: 'desc' }` |

Use camel-case TypeScript fields and snake-case SQL names. Export `materials`, `plants` and `plantCatalogue` for the query task, plus one configured `db` client from `src/db/client.ts`.

| Drizzle export | Fields and constraints |
| --- | --- |
| `materials` | `materialNumber` text primary key. Required `description`, `materialType` (`material_type` enum), `status` (`material_status` enum), `unitOfMeasure` and `updatedAt` (`timestamptz`, read as `Date`). Nullable `manufacturerName`, `manufacturerPartNumber` and `unitPriceAud` (`numeric(12,2)`, non-negative when supplied). |
| `plants` | `plantCode` text primary key. Required `name`, `city` and `state` as text. |
| `plantCatalogue` | Required `materialNumber` and `plantCode`, both foreign keys, with composite primary key `(materialNumber, plantCode)`. Required non-negative `quantityOnHand` as `numeric(12,3)`. Add a B-tree index on `plantCode`. |

Use Drizzle’s string mapping for both numeric columns. Pass stored prices and quantities as exact decimal strings. Each balance uses the material’s `unitOfMeasure`. A zero balance row represents a plant that carries a depleted item. An absent balance row represents a site outside the assortment. The query task computes all-plant totals from the balances. [Drizzle PostgreSQL column types](https://orm.drizzle.team/docs/column-types)

## 2. Generate and apply the initial migration

Configure Drizzle Kit for PostgreSQL, `src/db/schema.ts` and `src/db/migrations/`. Use the scaffold’s database configuration and installed driver. Generate and review the initial SQL with the pinned tooling. From the repository root, the direct generation command is `npm exec -- drizzle-kit generate --config=src/db/drizzle.config.ts`. Commit the SQL and the generated migration metadata. Review the enum values, nullability, keys, numeric checks and plant index in the SQL.

The API startup sequence is **database healthy → apply checked-in migrations → `npm run db:seed` → API listen**. Use the migration command from the scaffold handoff. If its name is open, use `npm run db:migrate` and have the scaffold owner wire it to the agreed entry point. Confirm that both commands can run inside the final API image and that the migration files resolve from its working directory. [Drizzle Kit generate](https://orm.drizzle.team/docs/drizzle-kit-generate) · [Drizzle Kit migrate](https://orm.drizzle.team/docs/drizzle-kit-migrate)

## 3. Implement the deterministic seed

1. **Generate 5,000 distinct products.** Target 3,000 spare parts, 1,100 consumables, 500 raw materials and 400 tools, including the reserved fixtures. Use fixed template order, a fixed random seed if using randomness, and fixed UTC date inputs with some intentional ties. Make each variant plausible for its family. Use visibly synthetic identifiers for generated variants and preserve the named SKF fixture. Preserve meaningful nulls such as an unverified MPN or missing price. Keep the generator offline and use the available checked-in inputs.
2. **Use price evidence at the right level.** Use plausible family-specific illustrative price ranges and units. Record any sources actually used; evidence for every family is not required. For generated rows, construct fixed-scale decimal strings from integer cents for price and integer thousandths for stock. Use whole units for `EA` and `SET`, and fractional units where appropriate for `M`, `KG` and `L`.
3. **Assign plant balances.** Use the CBD postcode as the text `plantCode` for each site. Assign Melbourne, VIC `3000`, Sydney, NSW `2000`, Brisbane, QLD `4000` and Perth, WA `6000`. This mapping supersedes the illustrative plant codes in earlier source plans and wireframes. Give every material at least one balance row and give common parts broader plant coverage. Target Melbourne ~35%, Sydney ~30%, Brisbane ~25% and Perth ~10% of `plant_catalogue` rows. Generate quantities independently for the assigned plants. Include some zero balances and all three lifecycle statuses.
4. **Reserve the demo fixtures.** Include the fixtures below within the 5,000 materials and reserve enough distinct bearing variants to guarantee the combined-search result. Validate material ID uniqueness, distinct non-null manufacturer–MPN pairs, valid plant assignments, unique material–plant pairs and the fixture cohort before writing.
5. **Insert and exit cleanly.** Run `src/db/seed.ts`, or its built equivalent, against the same database as the API. Insert `plants`, then `materials`, then `plant_catalogue` in manageable batches inside one transaction. Use conflict handling on those primary keys so rerunning preserves existing data. Let errors roll back the transaction, return a nonzero command exit and close the database connection on completion. [Drizzle inserts](https://orm.drizzle.team/docs/insert) · [Drizzle transactions](https://orm.drizzle.team/docs/transactions)

| Fixture | Exact setup and expected result |
| --- | --- |
| `MAT-000123` | `Active` `Spare Part`, SKF `6205-2RS1`, description `Deep-groove ball bearing, 25 mm bore × 52 mm OD × 15 mm width`, `EA`, synthetic unit price `19.95`. Brisbane `12.000`, Melbourne `28.000`, Sydney `0.000`, no Perth balance. SQL all-plant sum is `40.000`. The UI can display 40 EA. Brisbane qualifies, Sydney does not. |
| `MAT-000124` | `Raw Material`, stainless-steel shim stock offcuts, `KG`, null price. Brisbane `0.100`, Melbourne `0.200`. SQL sum `0.300`. The API owner verifies those values remain strings over HTTP. |
| Combined bearing search | At least 76 distinct materials, including `MAT-000123`, match `bearing` + `Active` + `Spare Part` + positive Brisbane stock. Record the exact seeded count and number of 25-row pages. |

Use `/materials?search=bearing&status=Active&materialType=Spare%20Part&plantCode=4000&page=2` as the shared demo view.

## 4. Verify and hand off

Run the checks with the scaffold commands against an empty PostgreSQL volume in a disposable Compose project. Record the commands and observed results for the API and reviewer agents.

| Check | Evidence to hand off |
| --- | --- |
| Fresh boot | Migration applied before seed. The command succeeds from the API image. Query the count of plants, materials and balance rows. Confirm four plants, 5,000 distinct materials, a balance for every material, all four types and the intended unit variety. |
| Data quality | Report the material counts by type, actual plant row counts and percentages, and examples across product families. Check for duplicate material–plant pairs and review a sample of illustrative prices and units. |
| PostgreSQL constraints | In isolated transactions, verify invalid or missing material type, an invalid foreign key, a duplicate material–plant key and negative prices or quantities are rejected. Use a rollback for each check. |
| Rerun and repeatability | Rerun `npm run db:seed` against the same database. Check that all three table counts and fixture values match the first run. Confirm the same fixed generator inputs produce the same rows. |
| Demo fixtures | Check both materials and their balances with SQL. Check the exact decimal sums, nullable price, Sydney zero balance, absent Perth balance and filtered bearing count. Hand the combined demo URL and expected results to the reviewer. |
| Next-agent interface | Provide the schema and shared export names, plant code map, migration and seed commands, fixture IDs, example decimal values and any remaining source gaps. The API agent uses the same driver to verify the serialized decimal strings and all-plant totals. |
