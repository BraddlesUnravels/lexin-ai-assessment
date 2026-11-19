# Material Register typing plan

**Lexin AI Assessment · The Pragmatist**  
**Status** Planned for implementation  

The React client gets procedure inputs and results from `AppRouter`. Zod validates incoming values. Drizzle infers the types of the fields each query actually selects, and tRPC carries the composed result type to TanStack Query. PostgreSQL enforces the database schema. [API contract and implementation plan](./api-contract-implementation-plan.md)

## Type ownership

| Layer | Source of truth | Type at the next boundary |
| --- | --- | --- |
| Shared values | `src/shared/material-values.ts` defines the material type and status tuples, sort keys and list defaults. | Drizzle `pgEnum`, Zod `z.enum` and nuqs literal parsers reuse the same values. Material types are `Spare Part`, `Consumable`, `Raw Material` and `Tool`. Statuses are `Active`, `Pending Review` and `Obsolete`. Sort keys are `materialNumber` and `updatedAt`. |
| Browser URL | The React Router v7 nuqs adapter and grouped parsers turn the query string into typed search, filter, sort and page values. | Build the tRPC input from parsed values. Omit unset filters and keep the initial UI page size at 25. Changing search, filters or sort resets the page with the same URL update. |
| Procedure input | `src/shared/materials-list-input.ts` defines the strict Zod schema. tRPC runs it before calling the query. | Client input allows omitted defaults. `z.output<typeof listMaterialsInputSchema>` describes the normalized, defaulted values passed to Drizzle. A separate client request interface is unnecessary. |
| Database and queries | `src/db/schema.ts` declares columns and enums. The queries select named fields explicitly. | Drizzle supplies the projected types, including joins and nullability. `listMaterials()` assembles totals, nested balances and pagination, so its inferred result describes the full return value. |
| Server router | `src/api/trpc/router.ts` exports `AppRouter = typeof appRouter` as a type. | The tRPC client infers inputs and the serialized response through `AppRouter`. `materials.list` returns `{ rows, total, page, pageSize }`. `plants.list` takes no input and returns `{ plantCode, name, city, state }[]`. |
| React table | `trpc.materials.list.queryOptions(input)` and `trpc.plants.list.queryOptions()` feed `useQuery`. | Components infer their data from `useQuery`. Use `inferRouterOutputs<AppRouter>` when a component prop needs a named response or row type. |

Keep `src/shared/material-values.ts` browser-safe and use `import type { AppRouter }` in the UI. The UI typecheck resolves the server's types and dependencies. The built UI excludes the router, Express and the database modules. The shared Zod schema runs on the API path. The UI uses the shared values and nuqs parsers. [TypeScript type-only imports](https://www.typescriptlang.org/docs/handbook/2/modules.html) · [Drizzle PostgreSQL types](https://orm.drizzle.team/docs/column-types) · [nuqs adapters](https://nuqs.dev/docs/adapters) · [nuqs parsers](https://nuqs.dev/docs/parsers/built-in) · [Grouped URL updates](https://nuqs.dev/docs/batching) · [tRPC inference](https://trpc.io/docs/client/vanilla/infer-types) · [tRPC query options](https://trpc.io/docs/client/tanstack-react-query/usage)

## Input and wire representations

| Value | Representation and rationale |
| --- | --- |
| List search and filters | `search` is trimmed text with a maximum of 200 characters, with blank search applying no text predicate. `status` and `materialType` are optional literal unions. `plantCode` is a trimmed, nonempty string when supplied. Keeping codes as strings preserves identifiers with leading zeroes. An unknown code yields an empty result. |
| Paging and sorting | `page` and `pageSize` are numbers by the time the tRPC client sends them. Zod validates the integer bounds independently of URL parsing. Defaults are `page = 1`, `pageSize = 25`, `sortBy = updatedAt` and `sortDirection = desc`. Page size accepts 1–100 at the API boundary. |
| Dates | Drizzle reads `updatedAt` as a `Date` on the server. Standard JSON delivers an ISO timestamp string. The UI takes its type from the client contract and parses a date only where formatting requires it. |
| Decimals | PostgreSQL uses exact `numeric` columns. Prices and quantities cross the API as strings without converting through JavaScript `number`. For the Q3 window sum, `.mapWith(String)` decodes the driver result. Verify that the selected driver supplies a precision-preserving value before the decoder runs. |
| Null and empty values | Nullable catalogue fields, including manufacturer fields and unit price, retain `null` in JSON. Absent plant balance records yield `totalQuantityOnHand: "0"` and `plantBalances: []`. Actual zero-balance records remain in the nested array. An out-of-range page returns an empty `rows` array and the matched count. |
| Errors | Successful data keeps its inferred type. tRPC reports validation and thrown errors through its shared error boundary, and TanStack Query exposes them through the query error state. Known API failures can throw a `TRPCError` with an intentional code. Unexpected errors reach the same boundary and the client gets a generic server error. |

[Zod schemas](https://zod.dev/api) · [Zod input and output inference](https://zod.dev/basics) · [tRPC validators](https://trpc.io/docs/server/validators) · [tRPC serialization](https://trpc.io/docs/server/data-transformers) · [Drizzle SQL result decoders](https://orm.drizzle.team/docs/sql) · [PostgreSQL numeric types](https://www.postgresql.org/docs/current/datatype-numeric.html) · [tRPC error handling](https://trpc.io/docs/server/error-handling) · [tRPC error formatting](https://trpc.io/docs/server/error-formatting)

## Options considered

| Option | Trade-off and decision |
| --- | --- |
| **Explicit Zod input schema · selected** | The input describes operations on the catalogue, including search, sort and pagination. A dedicated schema keeps defaults and validation at the API boundary. The typed client means routine numbers arrive as numbers. Broad server-side coercion adds little for the chosen transport. [Zod schemas and coercion](https://zod.dev/api) |
| **TypeBox or Valibot** | TypeBox gives a JSON Schema representation, useful with a schema-based host. Valibot offers modular validation and transformations. Zod covers the current input needs, and a minimal browser validator bundle provides little benefit because validation runs on the API. [TypeBox](https://github.com/sinclairzx81/typebox) · [Valibot](https://valibot.dev/guides/introduction/) |
| **Drizzle-derived Zod schemas** | Generated schemas suit table-shaped inputs or outputs. List parameters require their own schema, and the composed response would still need nested balances, computed totals, pagination and wire types. A generated update schema could be a starting point for a future edit after restricting it to fields the API permits callers to change. [Drizzle Zod integration](https://orm.drizzle.team/docs/zod) |
| **Approach A · projection and composed-result inference · selected** | The projected fields, joins and nullability flow through tRPC. A changed projection can change the app's client contract, so check the client and wire behavior when exposing a field. A custom SQL expression needs its own runtime decoder. [Drizzle SELECT](https://orm.drizzle.team/docs/select) · [Drizzle SQL result decoders](https://orm.drizzle.team/docs/sql) |
| **Extend `$inferSelect`, add a response DTO, or validate outputs at runtime** | `$inferSelect` is useful for whole table rows. A DTO or runtime validator is useful when an independent consumer contract needs stability or runtime enforcement. For these two reads, each would duplicate part of the projection and the enriched shape. [Drizzle SELECT](https://orm.drizzle.team/docs/select) · [tRPC output validators](https://trpc.io/docs/server/validators) |
| **Custom transformer or decimal arithmetic library** | A transformer can send richer JavaScript types such as `Date` but adds configuration to both ends. A decimal library can support future client-side arithmetic. The current table can display JSON timestamps and decimal strings directly. Database text would require conversion for numeric operations. Binary floating point would give up exact decimal representation. [tRPC data transformers](https://trpc.io/docs/server/data-transformers) · [PostgreSQL numeric types](https://www.postgresql.org/docs/current/datatype-numeric.html) · [decimal.js](https://mikemcl.github.io/decimal.js/) |

## Routine changes and checks

| Change | Implementation and verification |
| --- | --- |
| Add a visible column | Add the schema and migration if storage changes, then the explicit query projection and the table cell. Check both TypeScript builds and the HTTP response, including null from existing rows where applicable. A calculated SQL value needs runtime decoding as well as an inferred type. |
| Add a filter | Update the shared values if it introduces a new fixed set, then the Zod list input and shared predicate, the nuqs parser and UI control. Verify invalid API input, a copied URL, reset behavior and the same filtering in the count and the material page. |
| Implement the optional edit | Validate the material number and an explicit partial set of editable fields. Define omission as leaving a field alone, and permit `null` only for a nullable field that can be cleared. A row version would be a separate contract change if stale-write detection is later required. |
| Verify the boundaries | Check that TypeScript catches mismatched procedure params and row fields, the browser receives ISO strings and exact decimals, a bad request fails before SQL, and the built UI contains browser-safe code. Exercise database errors through the shared tRPC handler as well as normal and empty results. |

The linked official documentation. The checks above apply when the application is implemented.
