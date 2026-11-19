import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import { materials } from '../../../src/db/schema.ts';
import * as schema from '../../../src/db/schema.ts';
import { applyMigrations } from '../../../src/db/migrate.ts';
import { seedDatabase } from '../../../src/db/seed.ts';
import { listMaterials } from '../../../src/db/queries/materials.ts';
import {
  listMaterialsInputSchema,
  type ListMaterialsInput,
} from '../../../src/shared/materials-list-input.ts';
import {
  startPostgresTestDatabase,
  stopPostgresTestDatabase,
} from './postgres-test-database.ts';
import type { PostgresTestDatabase } from './postgres-test-database.ts';

let testDatabase: PostgresTestDatabase;
let pool: Pool;
let database: NodePgDatabase<typeof schema>;
const queryLog: string[] = [];

const referenceWhere = `
  ($1::text is null
    or strpos(lower(m.material_number), lower($1)) > 0
    or strpos(lower(m.description), lower($1)) > 0
    or strpos(lower(coalesce(m.manufacturer_part_number, '')), lower($1)) > 0)
  and ($2::material_status is null or m.status = $2)
  and ($3::material_type is null or m.material_type = $3)
  and ($4::text is null or exists (
    select 1
    from plant_catalogue as stock
    where stock.material_number = m.material_number
      and stock.plant_code = $4
      and stock.quantity_on_hand > 0
  ))
`;

async function getSqlReference(input: ListMaterialsInput) {
  const values = [
    input.search ?? null,
    input.status ?? null,
    input.materialType ?? null,
    input.plantCode ?? null,
  ];
  const countResult = await pool.query<{ total: number }>(
    `select count(*)::int as total from materials as m where ${referenceWhere}`,
    values,
  );
  const sortColumn =
    input.sortBy === 'materialNumber' ? 'm.material_number' : 'm.updated_at';
  const orderBy = `${sortColumn} ${input.sortDirection}${
    input.sortBy === 'updatedAt' ? ', m.material_number asc' : ''
  }`;
  const offset = (input.page - 1) * input.pageSize;
  const pageResult = await pool.query<{ material_number: string }>(
    `select m.material_number from materials as m
     where ${referenceWhere}
     order by ${orderBy}
     limit $5 offset $6`,
    [...values, input.pageSize, offset],
  );

  return {
    total: countResult.rows[0]?.total ?? 0,
    materialNumbers: pageResult.rows.map(
      ({ material_number }) => material_number,
    ),
  };
}

async function expectSqlParity(input: ListMaterialsInput) {
  const [result, reference] = await Promise.all([
    listMaterials(input, database),
    getSqlReference(input),
  ]);
  expect(result.total).toBe(reference.total);
  expect(result.rows.map((row) => row.materialNumber)).toEqual(
    reference.materialNumbers,
  );
  return result;
}

describe('Material Register database queries', () => {
  beforeAll(async () => {
    testDatabase = await startPostgresTestDatabase();
    pool = testDatabase.pool;
    await applyMigrations(drizzle(pool, { schema }));
    await seedDatabase(drizzle(pool, { schema }));
    database = drizzle(pool, {
      schema,
      logger: {
        logQuery(query) {
          queryLog.push(query);
        },
      },
    });
  }, 180_000);

  afterAll(async () => {
    if (testDatabase) {
      await stopPostgresTestDatabase(testDatabase);
    }
  });

  it('should match filtered pages against SQL and skip balances for an empty page', async () => {
    const input = listMaterialsInputSchema.parse({
      search: 'bearing',
      status: 'Active',
      materialType: 'Spare Part',
      plantCode: '4000',
      page: 2,
    });
    const result = await expectSqlParity(input);
    expect(result.total).toBeGreaterThanOrEqual(76);
    expect(result.rows).toHaveLength(25);
    queryLog.length = 0;
    const emptyPage = await expectSqlParity(
      listMaterialsInputSchema.parse({
        ...input,
        page: 999_999,
      }),
    );
    expect(emptyPage).toMatchObject({ rows: [], page: 999_999, pageSize: 25 });
    expect(queryLog).toHaveLength(2);
    expect(
      queryLog.every((query) => !query.includes('inner join "plants"')),
    ).toBe(true);
  });

  it('should search each text field case-insensitively and treat wildcards literally', async () => {
    const literalFixtures = [
      [
        'QUERY-LITERAL-PERCENT',
        'Literal token % in description',
        'PERCENT-ONLY',
        '%',
      ],
      [
        'QUERY-LITERAL-UNDERSCORE',
        'Literal token _ in description',
        'UNDERSCORE-ONLY',
        '_',
      ],
      [
        'QUERY-LITERAL-BACKSLASH',
        'Literal token \\ in description',
        'BACKSLASH-ONLY',
        '\\',
      ],
    ] as const;
    const literalMaterials: (typeof materials.$inferInsert)[] =
      literalFixtures.map(
        ([materialNumber, description, manufacturerPartNumber]) => ({
          materialNumber,
          description,
          materialType: 'Raw Material',
          status: 'Active',
          manufacturerName: 'Query Test',
          manufacturerPartNumber,
          unitOfMeasure: 'EA',
          unitPriceAud: null,
          updatedAt: new Date('2025-01-01T00:00:00.000Z'),
        }),
      );
    await database.insert(materials).values(literalMaterials);
    const searches = [
      ['mat-000123', 'MAT-000123'],
      ['deep-groove', 'MAT-000123'],
      ['6205-2rs1', 'MAT-000123'],
      ...literalFixtures.map(([materialNumber, , , search]) => [
        search,
        materialNumber,
      ]),
    ] as const;
    for (const [search, expectedMaterialNumber] of searches) {
      const input = listMaterialsInputSchema.parse({
        search,
        sortBy: 'materialNumber',
        sortDirection: 'asc',
      });
      const result = await expectSqlParity(input);
      expect(result.rows.map((row) => row.materialNumber)).toContain(
        expectedMaterialNumber,
      );
    }
  });

  it('should qualify positive plant stock while returning every plant balance and exact totals', async () => {
    const brisbaneInput = listMaterialsInputSchema.parse({
      search: 'MAT-000123',
      plantCode: '4000',
    });
    const brisbaneResult = await listMaterials(brisbaneInput, database);
    expect(brisbaneResult.rows).toHaveLength(1);
    expect(brisbaneResult.rows[0]).toMatchObject({
      totalQuantityOnHand: '40.000',
      plantBalances: [
        {
          plantCode: '4000',
          city: 'Brisbane',
          quantityOnHand: '12.000',
        },
        {
          plantCode: '3000',
          city: 'Melbourne',
          quantityOnHand: '28.000',
        },
        {
          plantCode: '2000',
          city: 'Sydney',
          quantityOnHand: '0.000',
        },
      ],
    });

    const fractional = await listMaterials(
      listMaterialsInputSchema.parse({ search: 'MAT-000124' }),
      database,
    );
    expect(fractional.rows[0]).toMatchObject({
      totalQuantityOnHand: '0.300',
    });
    expect(
      fractional.rows[0]?.plantBalances.map(({ plantCode, quantityOnHand }) => [
        plantCode,
        quantityOnHand,
      ]),
    ).toEqual([
      ['4000', '0.100'],
      ['3000', '0.200'],
    ]);
  });

  it('should sort either key in both directions and break timestamp ties by material number', async () => {
    const tiedAt = new Date('2025-01-01T00:00:00.000Z');
    const tiedMaterials: (typeof materials.$inferInsert)[] = [
      'QUERY-TIE-C',
      'QUERY-TIE-A',
      'QUERY-TIE-B',
    ].map((materialNumber) => ({
      materialNumber,
      description: 'Timestamp tie query probe',
      materialType: 'Raw Material',
      status: 'Active',
      unitOfMeasure: 'EA',
      updatedAt: tiedAt,
    }));
    await database.insert(materials).values(tiedMaterials);

    for (const sortBy of ['materialNumber', 'updatedAt'] as const) {
      for (const sortDirection of ['asc', 'desc'] as const) {
        const input = listMaterialsInputSchema.parse({
          sortBy,
          sortDirection,
          page: 3,
          pageSize: 11,
        });
        await expectSqlParity(input);
      }
    }

    const tieInput = listMaterialsInputSchema.parse({
      search: 'timestamp tie query probe',
      sortBy: 'updatedAt',
      sortDirection: 'desc',
    });
    const ties = await listMaterials(tieInput, database);
    expect(ties.rows.map((row) => row.materialNumber)).toEqual([
      'QUERY-TIE-A',
      'QUERY-TIE-B',
      'QUERY-TIE-C',
    ]);
  });

  it('should return zero stock for materials with no plant balances', async () => {
    await database.insert(materials).values({
      materialNumber: 'QUERY-NO-BALANCES',
      description: 'Material with no assigned plant',
      materialType: 'Raw Material',
      status: 'Active',
      unitOfMeasure: 'KG',
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    });

    const result = await listMaterials(
      listMaterialsInputSchema.parse({ search: 'QUERY-NO-BALANCES' }),
      database,
    );
    expect(result.rows[0]).toMatchObject({
      totalQuantityOnHand: '0',
      plantBalances: [],
    });
  });
});
