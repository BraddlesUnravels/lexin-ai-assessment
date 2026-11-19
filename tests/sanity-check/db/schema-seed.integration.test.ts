import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool, PoolClient } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../src/db/schema.ts';
import { applyMigrations } from '../../../src/db/migrate.ts';
import { seedDatabase } from '../../../src/db/seed.ts';
import { generateSeedData } from '../../../src/db/seed-data.ts';
import {
  startPostgresTestDatabase,
  stopPostgresTestDatabase,
} from './postgres-test-database.ts';
import type { PostgresTestDatabase } from './postgres-test-database.ts';

let testDatabase: PostgresTestDatabase;
let pool: Pool;
let database: NodePgDatabase<typeof schema>;

async function expectConstraintFailure(
  sql: string,
  values: unknown[],
  code: string,
): Promise<void> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query('begin');
    await expect(client.query(sql, values)).rejects.toMatchObject({ code });
  } finally {
    await client.query('rollback');
    client.release();
  }
}

describe('Material Register PostgreSQL schema and seed', () => {
  beforeAll(async () => {
    testDatabase = await startPostgresTestDatabase();
    pool = testDatabase.pool;
    database = drizzle(pool, { schema });
    await applyMigrations(database);
    await seedDatabase(database);
  }, 180_000);

  afterAll(async () => {
    if (testDatabase) {
      await stopPostgresTestDatabase(testDatabase);
    }
  });

  it('should create the expected enum types, numeric columns, constraints, and plant index', async () => {
    const enumResult = await pool.query<{
      typname: string;
      enumlabel: string;
    }>(
      `select t.typname, e.enumlabel
       from pg_type t
       join pg_enum e on e.enumtypid = t.oid
       where t.typname in ('material_type', 'material_status')
       order by t.typname, e.enumsortorder`,
    );
    expect(enumResult.rows).toEqual([
      { typname: 'material_status', enumlabel: 'Active' },
      { typname: 'material_status', enumlabel: 'Pending Review' },
      { typname: 'material_status', enumlabel: 'Obsolete' },
      { typname: 'material_type', enumlabel: 'Spare Part' },
      { typname: 'material_type', enumlabel: 'Consumable' },
      { typname: 'material_type', enumlabel: 'Raw Material' },
      { typname: 'material_type', enumlabel: 'Tool' },
    ]);

    const numericResult = await pool.query<{
      table_name: string;
      column_name: string;
      numeric_precision: number;
      numeric_scale: number;
    }>(
      `select table_name, column_name, numeric_precision, numeric_scale
       from information_schema.columns
       where table_name in ('materials', 'plant_catalogue')
         and column_name in ('unit_price_aud', 'quantity_on_hand')
       order by table_name, column_name`,
    );
    expect(numericResult.rows).toEqual([
      {
        table_name: 'materials',
        column_name: 'unit_price_aud',
        numeric_precision: 12,
        numeric_scale: 2,
      },
      {
        table_name: 'plant_catalogue',
        column_name: 'quantity_on_hand',
        numeric_precision: 12,
        numeric_scale: 3,
      },
    ]);

    const indexResult = await pool.query<{ indexdef: string }>(
      `select indexdef from pg_indexes
       where schemaname = 'public'
         and tablename = 'plant_catalogue'
         and indexname = 'plant_catalogue_plant_code_idx'`,
    );
    expect(indexResult.rows[0]?.indexdef).toContain('USING btree (plant_code)');
  });

  it('should reject invalid enums, missing required values, foreign keys, duplicate pairs, and negative decimals', async () => {
    const requiredMaterialColumns =
      '(material_number, description, material_type, status, unit_of_measure, updated_at)';
    const validMaterialValues: unknown[] = [
      'constraint-test',
      'Constraint test material',
      'Spare Part',
      'Active',
      'EA',
      new Date('2025-01-01T00:00:00.000Z'),
    ];
    const insertMaterial =
      `insert into materials ${requiredMaterialColumns} ` +
      'values ($1, $2, $3, $4, $5, $6)';

    await expectConstraintFailure(
      insertMaterial,
      [
        ...validMaterialValues.slice(0, 2),
        'Not a type',
        ...validMaterialValues.slice(3),
      ],
      '22P02',
    );
    for (let index = 0; index < validMaterialValues.length; index += 1) {
      const values = [...validMaterialValues];
      values[index] = null;
      await expectConstraintFailure(insertMaterial, values, '23502');
    }

    const validPlantValues = [
      'constraint-test-plant',
      'Constraint Test Plant',
      'Melbourne',
      'VIC',
    ];
    for (let index = 0; index < validPlantValues.length; index += 1) {
      const values = [...validPlantValues];
      values[index] = null;
      await expectConstraintFailure(
        `insert into plants (plant_code, name, city, state)
         values ($1, $2, $3, $4)`,
        values,
        '23502',
      );
    }

    await expectConstraintFailure(
      `insert into plant_catalogue (material_number, plant_code, quantity_on_hand)
       values ('MAT-000123', '9999', 1)`,
      [],
      '23503',
    );
    await expectConstraintFailure(
      `insert into plant_catalogue (material_number, plant_code, quantity_on_hand)
       values ('MISSING-MATERIAL', '4000', 1)`,
      [],
      '23503',
    );
    await expectConstraintFailure(
      `insert into plant_catalogue (material_number, plant_code, quantity_on_hand)
       values ('MAT-000123', '4000', 1)`,
      [],
      '23505',
    );
    await expectConstraintFailure(
      `update materials set unit_price_aud = -0.01
       where material_number = 'MAT-000123'`,
      [],
      '23514',
    );
    await expectConstraintFailure(
      `update plant_catalogue set quantity_on_hand = -0.001
       where material_number = 'MAT-000123' and plant_code = '4000'`,
      [],
      '23514',
    );
    await expectConstraintFailure(
      `update materials set unit_price_aud = 10000000000.00
       where material_number = 'MAT-000123'`,
      [],
      '22003',
    );
    await expectConstraintFailure(
      `update plant_catalogue set quantity_on_hand = 1000000000
       where material_number = 'MAT-000123' and plant_code = '4000'`,
      [],
      '22003',
    );

    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(
        `update materials set unit_price_aud = 1.239
         where material_number = 'MAT-000123'`,
      );
      const result = await client.query<{ unit_price_aud: string }>(
        `select unit_price_aud from materials
         where material_number = 'MAT-000123'`,
      );
      expect(result.rows[0]?.unit_price_aud).toBe('1.24');
    } finally {
      await client.query('rollback');
      client.release();
    }
  });

  it('should seed the prescribed plant assortment and every material type', async () => {
    const plantResult = await pool.query<{
      plant_code: string;
      name: string;
      city: string;
      state: string;
    }>(`select plant_code, name, city, state from plants order by plant_code`);
    expect(plantResult.rows).toEqual([
      {
        plant_code: '2000',
        name: 'Sydney Warehouse',
        city: 'Sydney',
        state: 'NSW',
      },
      {
        plant_code: '3000',
        name: 'Melbourne Distribution Centre',
        city: 'Melbourne',
        state: 'VIC',
      },
      {
        plant_code: '4000',
        name: 'Brisbane Service Warehouse',
        city: 'Brisbane',
        state: 'QLD',
      },
      {
        plant_code: '6000',
        name: 'Perth Warehouse',
        city: 'Perth',
        state: 'WA',
      },
    ]);

    const materialResult = await pool.query<{
      material_type: string;
      count: number;
      distinct_materials: number;
    }>(
      `select material_type, count(*)::int as count,
              count(distinct material_number)::int as distinct_materials
       from materials
       group by material_type
       order by material_type`,
    );
    expect(materialResult.rows).toEqual([
      { material_type: 'Spare Part', count: 3_000, distinct_materials: 3_000 },
      { material_type: 'Consumable', count: 1_100, distinct_materials: 1_100 },
      { material_type: 'Raw Material', count: 500, distinct_materials: 500 },
      { material_type: 'Tool', count: 400, distinct_materials: 400 },
    ]);

    const statusResult = await pool.query<{ status: string; count: number }>(
      `select status, count(*)::int as count
       from materials
       group by status
       order by status`,
    );
    expect(statusResult.rows.map((row) => row.status)).toEqual([
      'Active',
      'Pending Review',
      'Obsolete',
    ]);

    const integrityResult = await pool.query<{
      material_count: number;
      plant_count: number;
      balance_count: number;
      unassigned_count: number;
      duplicate_pairs: number;
      duplicate_manufacturer_parts: number;
      zero_balances: number;
    }>(
      `select
         (select count(*)::int from materials) as material_count,
         (select count(*)::int from plants) as plant_count,
         (select count(*)::int from plant_catalogue) as balance_count,
         (select count(*)::int from materials m
          where not exists (
            select 1 from plant_catalogue pc
            where pc.material_number = m.material_number
          )) as unassigned_count,
         (select count(*)::int from (
            select material_number, plant_code
            from plant_catalogue
            group by material_number, plant_code
            having count(*) > 1
          ) duplicates) as duplicate_pairs,
         (select count(*)::int from (
            select manufacturer_name, manufacturer_part_number
            from materials
            where manufacturer_name is not null
              and manufacturer_part_number is not null
            group by manufacturer_name, manufacturer_part_number
            having count(*) > 1
          ) duplicates) as duplicate_manufacturer_parts,
         (select count(*)::int from plant_catalogue
          where quantity_on_hand = 0) as zero_balances`,
    );
    expect(integrityResult.rows[0]).toMatchObject({
      material_count: 5_000,
      plant_count: 4,
      unassigned_count: 0,
      duplicate_pairs: 0,
      duplicate_manufacturer_parts: 0,
    });
    expect(integrityResult.rows[0]?.balance_count).toBeGreaterThan(5_000);
    expect(integrityResult.rows[0]?.zero_balances).toBeGreaterThan(0);

    const plantShareResult = await pool.query<{
      plant_code: string;
      share: number;
    }>(
      `select plant_code,
              (count(*)::numeric * 100 /
               (select count(*) from plant_catalogue))::float8 as share
       from plant_catalogue
       group by plant_code
       order by plant_code`,
    );
    const expectedPlantShares: Readonly<Record<string, number>> = {
      '2000': 30,
      '3000': 35,
      '4000': 25,
      '6000': 10,
    };
    for (const row of plantShareResult.rows) {
      expect(
        Math.abs(row.share - expectedPlantShares[row.plant_code]),
      ).toBeLessThan(2);
    }

    const unitResult = await pool.query<{ unit_of_measure: string }>(
      `select distinct unit_of_measure from materials order by unit_of_measure`,
    );
    expect(unitResult.rows.map((row) => row.unit_of_measure)).toEqual(
      expect.arrayContaining(['EA', 'KG', 'L', 'M', 'SET']),
    );
    const quantityResult = await pool.query<{
      fractional_whole_units: number;
      fractional_measure_units: number;
    }>(
      `select
         count(*) filter (
           where m.unit_of_measure in ('EA', 'SET')
             and pc.quantity_on_hand <> trunc(pc.quantity_on_hand)
         )::int as fractional_whole_units,
         count(*) filter (
           where m.unit_of_measure in ('M', 'KG', 'L')
             and pc.quantity_on_hand <> trunc(pc.quantity_on_hand)
         )::int as fractional_measure_units
       from materials m
       join plant_catalogue pc using (material_number)`,
    );
    expect(quantityResult.rows[0]?.fractional_whole_units).toBe(0);
    expect(quantityResult.rows[0]?.fractional_measure_units).toBeGreaterThan(0);

    const commonCoverage = await pool.query<{ plant_count: number }>(
      `select count(*)::int as plant_count
       from plant_catalogue where material_number = 'MAT-000001'`,
    );
    expect(commonCoverage.rows[0]?.plant_count).toBeGreaterThanOrEqual(3);
  });

  it('should generate identical catalogue rows from the fixed seed inputs', () => {
    expect(generateSeedData()).toEqual(generateSeedData());
  });

  it('should seed names and descriptions without synthetic labels', async () => {
    const result = await pool.query<{ labelled: number; benchpro: number }>(
      `select
         count(*) filter (
           where description ilike '%(synthetic)%'
              or manufacturer_name ilike '%(synthetic)%'
         )::int as labelled,
         count(*) filter (
           where manufacturer_name = 'BenchPro Tools'
         )::int as benchpro
       from materials`,
    );
    expect(result.rows[0]?.labelled).toBe(0);
    expect(result.rows[0]?.benchpro).toBeGreaterThan(0);
  });

  it('should preserve fixture balances and return an ordinary multi-page bearing search', async () => {
    const bearingResult = await pool.query<{
      material_number: string;
      manufacturer_name: string;
      manufacturer_part_number: string;
      unit_price_aud: string;
      total_quantity: string;
    }>(
      `select m.material_number, m.manufacturer_name,
              m.manufacturer_part_number, m.unit_price_aud,
              sum(pc.quantity_on_hand)::text as total_quantity
       from materials m
       join plant_catalogue pc using (material_number)
       where m.material_number = 'MAT-000123'
       group by m.material_number`,
    );
    expect(bearingResult.rows).toEqual([
      {
        material_number: 'MAT-000123',
        manufacturer_name: 'SKF',
        manufacturer_part_number: '6205-2RS1',
        unit_price_aud: '19.95',
        total_quantity: '40.000',
      },
    ]);

    const balancesResult = await pool.query<{
      plant_code: string;
      quantity_on_hand: string;
    }>(
      `select plant_code, quantity_on_hand
       from plant_catalogue
       where material_number = 'MAT-000123'
       order by plant_code`,
    );
    expect(balancesResult.rows).toEqual([
      { plant_code: '2000', quantity_on_hand: '0.000' },
      { plant_code: '3000', quantity_on_hand: '28.000' },
      { plant_code: '4000', quantity_on_hand: '12.000' },
    ]);

    const shimResult = await pool.query<{
      unit_price_aud: string | null;
      total_quantity: string;
    }>(
      `select m.unit_price_aud,
              sum(pc.quantity_on_hand)::text as total_quantity
       from materials m
       join plant_catalogue pc using (material_number)
       where m.material_number = 'MAT-000124'
       group by m.material_number`,
    );
    expect(shimResult.rows).toEqual([
      { unit_price_aud: null, total_quantity: '0.300' },
    ]);
    const shimBalances = await pool.query<{
      plant_code: string;
      quantity_on_hand: string;
    }>(
      `select plant_code, quantity_on_hand
       from plant_catalogue
       where material_number = 'MAT-000124'
       order by plant_code`,
    );
    expect(shimBalances.rows).toEqual([
      { plant_code: '3000', quantity_on_hand: '0.200' },
      { plant_code: '4000', quantity_on_hand: '0.100' },
    ]);

    const bearingSearchResult = await pool.query<{ match_count: number }>(
      `select count(distinct m.material_number)::int as match_count
       from materials m
       join plant_catalogue pc using (material_number)
       where m.description ilike '%bearing%'
         and m.status = 'Active'
         and m.material_type = 'Spare Part'
         and pc.plant_code = '4000'
         and pc.quantity_on_hand > 0`,
    );
    const matchCount = bearingSearchResult.rows[0]?.match_count ?? 0;
    expect(matchCount).toBeGreaterThanOrEqual(76);
    expect(Math.ceil(matchCount / 25)).toBeGreaterThanOrEqual(4);
  });

  it('should leave counts and fixture values unchanged when the seed runs again', async () => {
    const before = await pool.query<{
      materials: number;
      plants: number;
      balances: number;
      bearing_quantity: string;
      shim_quantity: string;
    }>(
      `select
         (select count(*)::int from materials) as materials,
         (select count(*)::int from plants) as plants,
         (select count(*)::int from plant_catalogue) as balances,
         (select sum(quantity_on_hand)::text from plant_catalogue
          where material_number = 'MAT-000123') as bearing_quantity,
         (select sum(quantity_on_hand)::text from plant_catalogue
          where material_number = 'MAT-000124') as shim_quantity`,
    );
    await seedDatabase(database);
    const after = await pool.query<{
      materials: number;
      plants: number;
      balances: number;
      bearing_quantity: string;
      shim_quantity: string;
    }>(
      `select
         (select count(*)::int from materials) as materials,
         (select count(*)::int from plants) as plants,
         (select count(*)::int from plant_catalogue) as balances,
         (select sum(quantity_on_hand)::text from plant_catalogue
          where material_number = 'MAT-000123') as bearing_quantity,
         (select sum(quantity_on_hand)::text from plant_catalogue
          where material_number = 'MAT-000124') as shim_quantity`,
    );

    expect(after.rows).toEqual(before.rows);
  });
});
