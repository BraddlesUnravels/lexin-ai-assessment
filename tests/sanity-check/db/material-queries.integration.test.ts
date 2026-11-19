import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from '../../../src/db/schema.ts';
import { applyMigrations } from '../../../src/db/migrate.ts';
import { seedDatabase } from '../../../src/db/seed.ts';
import { listMaterials } from '../../../src/db/queries/materials.ts';
import { listPlants } from '../../../src/db/queries/plants.ts';
import { listMaterialsInputSchema } from '../../../src/shared/materials-list-input.ts';
import { materials, plantCatalogue } from '../../../src/db/schema.ts';
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

async function getSqlReference(input: {
  search?: string;
  status?: string;
  materialType?: string;
  plantCode?: string;
  sortBy: 'materialNumber' | 'updatedAt';
  sortDirection: 'asc' | 'desc';
  page: number;
  pageSize: number;
}) {
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
  const orderBy =
    input.sortBy === 'updatedAt'
      ? `${sortColumn} ${input.sortDirection}, m.material_number asc`
      : `${sortColumn} ${input.sortDirection}`;
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
    materialNumbers: pageResult.rows.map((row) => row.material_number),
  };
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

  it('should match the combined filter count and ordered page from independent SQL', async () => {
    const input = listMaterialsInputSchema.parse({
      search: 'bearing',
      status: 'Active',
      materialType: 'Spare Part',
      plantCode: '4000',
      page: 2,
    });
    const [result, reference] = await Promise.all([
      listMaterials(input, database),
      getSqlReference(input),
    ]);

    expect(result.total).toBe(reference.total);
    expect(result.total).toBeGreaterThanOrEqual(76);
    expect(result.rows.map((row) => row.materialNumber)).toEqual(
      reference.materialNumbers,
    );
    expect(result.rows).toHaveLength(25);
  });

  it('should find a fixture through each case-insensitive search field', async () => {
    for (const search of ['mat-000123', 'deep-groove', '6205-2rs1']) {
      const input = listMaterialsInputSchema.parse({
        search,
        sortBy: 'materialNumber',
        sortDirection: 'asc',
      });
      const result = await listMaterials(input, database);

      expect(
        result.rows.map((row) => row.materialNumber),
        `search term: ${search}`,
      ).toContain('MAT-000123');
    }
  });

  it('should treat percent, underscore, and backslash searches as literal substrings', async () => {
    const fixtures = [
      {
        materialNumber: 'QUERY-LITERAL-PERCENT',
        description: 'Literal token % in description',
        manufacturerPartNumber: 'PERCENT-ONLY',
        search: '%',
      },
      {
        materialNumber: 'QUERY-LITERAL-UNDERSCORE',
        description: 'Literal token _ in description',
        manufacturerPartNumber: 'UNDERSCORE-ONLY',
        search: '_',
      },
      {
        materialNumber: 'QUERY-LITERAL-BACKSLASH',
        description: 'Literal token \\ in description',
        manufacturerPartNumber: 'BACKSLASH-ONLY',
        search: '\\',
      },
    ] as const;
    const literalMaterials: (typeof materials.$inferInsert)[] = fixtures.map(
      ({ materialNumber, description, manufacturerPartNumber }) => ({
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
    await database.insert(plantCatalogue).values(
      fixtures.map(({ materialNumber }) => ({
        materialNumber,
        plantCode: '3000',
        quantityOnHand: '1.000',
      })),
    );

    for (const fixture of fixtures) {
      const input = listMaterialsInputSchema.parse({
        search: fixture.search,
        sortBy: 'materialNumber',
      });
      const [result, reference] = await Promise.all([
        listMaterials(input, database),
        getSqlReference(input),
      ]);

      expect(result.rows.map((row) => row.materialNumber)).toEqual(
        reference.materialNumbers,
      );
      expect(result.rows.map((row) => row.materialNumber)).toContain(
        fixture.materialNumber,
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
      unitOfMeasure: 'EA',
      unitPriceAud: '19.95',
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

    for (const plantCode of ['2000', '9999']) {
      const result = await listMaterials(
        listMaterialsInputSchema.parse({
          search: 'MAT-000123',
          plantCode,
        }),
        database,
      );
      expect(result).toMatchObject({ rows: [], total: 0 });
    }

    const fractional = await listMaterials(
      listMaterialsInputSchema.parse({ search: 'MAT-000124' }),
      database,
    );
    expect(fractional.rows[0]).toMatchObject({
      unitPriceAud: null,
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
        const [result, reference] = await Promise.all([
          listMaterials(input, database),
          getSqlReference(input),
        ]);
        expect(result.total).toBe(reference.total);
        expect(result.rows.map((row) => row.materialNumber)).toEqual(
          reference.materialNumbers,
        );
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

    const seededPage = await listMaterials(
      listMaterialsInputSchema.parse({
        sortBy: 'updatedAt',
        sortDirection: 'desc',
        pageSize: 100,
      }),
      database,
    );
    const newestTimestamp = seededPage.rows[0]?.updatedAt.getTime();
    const seededTies = seededPage.rows
      .filter((row) => row.updatedAt.getTime() === newestTimestamp)
      .map((row) => row.materialNumber);
    expect(seededTies.length).toBeGreaterThan(1);
    expect(seededTies).toEqual([...seededTies].sort());
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

  it('should keep the match count and skip the balance query for an out-of-range page', async () => {
    const input = listMaterialsInputSchema.parse({
      search: 'bearing',
      status: 'Active',
      materialType: 'Spare Part',
      plantCode: '4000',
      page: 999_999,
    });
    const expected = await getSqlReference(input);
    queryLog.length = 0;

    const result = await listMaterials(input, database);

    expect(result).toMatchObject({
      rows: [],
      total: expected.total,
      page: 999_999,
      pageSize: 25,
    });
    expect(queryLog).toHaveLength(2);
    expect(
      queryLog.every((query) => !query.includes('inner join "plants"')),
    ).toBe(true);
  });

  it('should list plants by name and then plant code', async () => {
    const result = await listPlants(database);

    expect(result.map((plant) => plant.name)).toEqual([
      'Brisbane Service Warehouse',
      'Melbourne Distribution Centre',
      'Perth Warehouse',
      'Sydney Warehouse',
    ]);
    expect(result.find((plant) => plant.plantCode === '4000')).toMatchObject({
      city: 'Brisbane',
      state: 'QLD',
    });
  });
});
