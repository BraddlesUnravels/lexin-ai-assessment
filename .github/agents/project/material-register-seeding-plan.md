# Material Register seeding plan

**Lexin AI assessment · The Pragmatist**  
**Status** Proposed seed specification for the schema and seed task.

## Catalogue scenario

The seed owner may spend at most 10 minutes total checking a few public examples. Stop at the limit and use plausible synthetic assumptions for gaps. No separate sourcing handoff, ledger or family-rules file is required. Record sources actually used briefly. Generated identities and prices are illustrative.

Use a fictional Australian distributor of mechanical maintenance parts and workshop supplies. It imports and stocks products for industrial maintenance teams and machinery repairers, including workshops that service agricultural equipment. Its four warehouses are represented as plants in the register. Bearings, drive components, hydraulic fittings and workshop tools belong in the same assortment. Farm inputs such as fertiliser, herbicide and feed would imply a separate line of business. The workshop assortment already supports stock by piece, set, metre, kilogram and litre. [Motion Australia product categories](https://www.motion.com.au/) · [RS Australia engineering materials](https://au.rs-online.com/web/c/engineering-materials-industrial-hardware/?pn=687)

The bearing in the brief is a good example of a standard component shared across equipment types. Use the existing `MAT-000123` fixture and take its dimensions from the exact manufacturer part number. SKF lists `6205-2RS1` at 25 mm bore × 52 mm outside diameter × 15 mm width. The RS listing is for the shielded `6205-2Z/C3LHT23` variant. Keep separate material numbers for materially different variants even when the three dimensions match. [SKF 6205-2RS1](https://www.emarketplace.in.skf.com/deep-groove-ball-bearing/6205-2rs1) · [RS 6205-2Z/C3LHT23](https://sg.rs-online.com/web/p/ball-bearings/1262381)

## Proposed catalogue mix

| Material type | Target rows | Product families | Base units |
| --- | ---: | --- | --- |
| Spare Part | 3,000 | Deep-groove, tapered and housed bearings, belts, roller chain, sprockets, oil seals, hydraulic fittings and replacement couplings | `EA`, `M` for chain sold by length |
| Consumable | 1,100 | Cutting and grinding discs, threadlocker, hydraulic oil, grease and anti-seize | `EA` for discs and packaged products, `L` or `KG` for bulk stock |
| Raw Material | 500 | Mild-steel round bar, stainless flat stock, shim stock and gasket rolls for workshop fabrication | `M`, `KG` |
| Tool | 400 | Bearing pullers, torque wrenches, circlip pliers, grease guns, callipers and socket sets | `EA`, `SET` |
| **Total** | **5,000** | Includes the demo fixtures | |

Treat the row mix as a design target for the fictional company. Use family-specific templates whose descriptions read like catalogue entries. For example, specify bore, outside diameter and width for a bearing, thread and size for a hydraulic fitting, and drive size and torque range for a torque wrench. Choose dimensions and variants from defined combinations for each family. Give each catalogue item a distinguishable product specification or manufacturer variant. Use visibly synthetic manufacturer part numbers for generated variants and preserve the named SKF fixture. Prices, lifecycle statuses, dates and balances are demo values. Leave a small number of nullable fields blank where they fit the product, such as a missing MPN for generic cut stock or a missing price for a pending-review item.

Use a single base unit per material across every plant and interpret price in AUD per that unit. Generate whole quantities for `EA` and `SET` and allow fractions for `M`, `KG` and `L`. Keep family-specific price and quantity bands so a torque wrench and a common oil seal do not draw from the same range. Include some tied update timestamps and all three lifecycle statuses. Stock and lifecycle vary independently, so some active materials can be depleted.

## Plant allocation

| Plant | CBD postcode used as `plantCode` | Share of plant catalogue rows |
| --- | --- | ---: |
| Melbourne, VIC | `3000` | ~35% |
| Sydney, NSW | `2000` | ~30% |
| Brisbane, QLD | `4000` | ~25% |
| Perth, WA | `6000` | ~10% |

Store plant codes as text. Use `4000` for Brisbane in the fixture records and demo URL. [Sydney](https://auspost.com.au/postcode/sydney-2000) · [Melbourne](https://auspost.com.au/postcode/melbourne-3000) · [Brisbane City](https://auspost.com.au/postcode/brisbane-city-4000) · [Perth](https://auspost.com.au/postcode/perth-6000)

The agreed percentages describe rows in `plant_catalogue`. Every material appears at one or more plants. Stock common replacement parts across several sites and keep specialist variants at fewer. Pick distinct plants using the agreed weights and sample stock amounts separately for each assigned plant. An assigned plant may have a zero balance. An unassigned plant has no balance row. Report the observed plant shares after the mandatory fixtures have been added.

## Seed fixtures and checks

| Fixture | Definition and expected behaviour |
| --- | --- |
| Stock expansion | `MAT-000123` is an active SKF spare part, MPN `6205-2RS1`, unit `EA`, price `19.95`, description `Deep-groove ball bearing, 25 mm bore × 52 mm OD × 15 mm width`. Give it Brisbane 12, Melbourne 28 and Sydney 0. Leave Perth unassigned. The Brisbane filter includes the material, the Sydney filter excludes it, and the expanded total is 40 EA. The material number, description and MPN each provide a case-insensitive search example. |
| Multi-page search | Guarantee at least 76 distinct materials, including `MAT-000123`, for `bearing` + `Active` + `Spare Part` + positive stock at Brisbane. Reserve qualifying slots in the bearing templates so the demo works regardless of the generated background rows. Record the observed count and page count after seed. At 25 per page, the demo spans at least four pages. |
| Fractional stock | `MAT-000124` is `Raw Material`, for example stainless-steel shim stock offcuts tracked in `KG`, with a null price. Seed Brisbane `0.100` and Melbourne `0.200`. Verify exact API strings and total `"0.300"`. |

## Script contract

Use a small TypeScript seed driven by catalogue templates and fixed inputs. A seeded random generator can vary dates, status, prices and plant quantities within those templates. Faker can provide repeatable generic values with a fixed seed and reference date, but the product rules would still live in our code. Skip the extra dependency for this dataset and keep the seed self-contained. [Faker reproducibility](https://fakerjs.dev/guide/usage.html#reproducible-results)

| Responsibility | Proposed implementation |
| --- | --- |
| Entry point | The scaffold exposes `npm run db:seed`. It executes `src/db/seed.ts`, or its built equivalent, inside the API image with the same database configuration as the API. Start it after migrations. |
| Generate | Reserve fixture IDs first. Use stable template order, a fixed random seed and fixed UTC date inputs. Generate consistent product variants and deterministic quantities and prices. Construct fixed-scale decimal strings from integer cents or thousandths. Keep the catalogue templates beside the seed, in `src/db/seed-data.ts` if the separation improves readability. |
| Validate | Before inserting, check material count and unique IDs, distinct non-null manufacturer–MPN pairs, at least one plant per material, no duplicate material–plant keys and the required demo cohort. |
| Insert | Use the existing Drizzle client and one transaction. Insert `plants`, `materials`, then `plant_catalogue` in manageable batches. Skip conflicts on the relevant keys so a repeat run preserves existing rows. Report failure with a nonzero exit and close the database connection when the command finishes. |
| Verify | From a fresh volume, confirm 5,000 materials, all four types, distinct IDs, realistic variant samples, the expected unit variety and the fixture checks. Run the seed again and compare table counts and fixture values. Check the exact decimal sum again over the API once the list procedure is available. |

The schema and seed task owns the executable and the fixture checks. The scaffold task owns the root npm command and its position in API startup. Record the observed seed counts and the combined-search fixture in the reviewer notes. Use the existing schema architecture and implementation plan for column names, constraints and startup order. [Drizzle inserts and conflict handling](https://orm.drizzle.team/docs/insert) · [Drizzle transactions](https://orm.drizzle.team/docs/transactions)
