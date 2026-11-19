import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import type { Server } from 'node:http';
import * as schema from '../../src/db/schema.ts';
import { applyMigrations } from '../../src/db/migrate.ts';
import { seedDatabase } from '../../src/db/seed.ts';
import { createApiApp } from '../../src/api/server.ts';
import { createAppRouter } from '../../src/api/trpc/router.ts';
import {
  startPostgresTestDatabase,
  stopPostgresTestDatabase,
} from './db/postgres-test-database.ts';
import type { PostgresTestDatabase } from './db/postgres-test-database.ts';

type MaterialRow = {
  materialNumber: string;
  unitOfMeasure: string;
  unitPriceAud: string | null;
  updatedAt: string;
  totalQuantityOnHand: string;
  plantBalances: Array<{
    plantCode: string;
    quantityOnHand: string;
  }>;
};

type MaterialsResponse = {
  result?: {
    data?: {
      rows?: MaterialRow[];
      total?: number;
      page?: number;
      pageSize?: number;
    };
  };
};

type ErrorResponse = {
  error?: {
    message?: string;
    data?: {
      code?: string;
      stack?: string;
    };
  };
};

let testDatabase: PostgresTestDatabase;
let pool: Pool;
let apiServer: Server;
let apiBaseUrl: string;
let database: NodePgDatabase<typeof schema>;
const queryLog: string[] = [];

async function request(
  procedure: string,
  input?: Record<string, unknown>,
): Promise<Response> {
  const inputQuery =
    input === undefined
      ? ''
      : `?input=${encodeURIComponent(JSON.stringify(input))}`;
  return fetch(`${apiBaseUrl}/${procedure}${inputQuery}`);
}

describe('Material Register tRPC API', () => {
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

    await new Promise<void>((resolve, reject) => {
      apiServer = createApiApp(createAppRouter(database)).listen(
        0,
        '127.0.0.1',
      );
      apiServer.once('listening', resolve);
      apiServer.once('error', reject);
    });
    const address = apiServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('The API test server did not bind a TCP port.');
    }
    apiBaseUrl = `http://127.0.0.1:${address.port}/api/trpc`;
  }, 180_000);

  afterAll(async () => {
    if (apiServer?.listening) {
      await new Promise<void>((resolve, reject) => {
        apiServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
    if (testDatabase) {
      await stopPostgresTestDatabase(testDatabase);
    }
  });

  it('should return the material page and ordered plant lookup over HTTP', async () => {
    const [materialsResponse, plantsResponse] = await Promise.all([
      request('materials.list', {}),
      request('plants.list'),
    ]);
    expect(materialsResponse.status).toBe(200);
    expect(plantsResponse.status).toBe(200);

    const materialsPayload =
      (await materialsResponse.json()) as MaterialsResponse;
    const page = materialsPayload.result?.data;
    expect(page?.rows).toHaveLength(25);
    expect(page).toMatchObject({
      total: 5_000,
      page: 1,
      pageSize: 25,
    });
    expect(page?.rows?.[0]?.updatedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/,
    );
    expect(page?.rows?.[0]).toHaveProperty('unitOfMeasure');

    expect(await plantsResponse.json()).toMatchObject({
      result: {
        data: [
          { plantCode: '4000', city: 'Brisbane', state: 'QLD' },
          { plantCode: '3000', city: 'Melbourne', state: 'VIC' },
          { plantCode: '6000', city: 'Perth', state: 'WA' },
          { plantCode: '2000', city: 'Sydney', state: 'NSW' },
        ],
      },
    });
  });

  it('should reject invalid input before executing a list query', async () => {
    const invalidInputs = [
      { page: 0 },
      { pageSize: 101 },
      { search: 'x'.repeat(201) },
      { status: 'Bad' },
      { sortBy: 'description' },
      { bogus: true },
      { plantCode: '   ' },
    ];

    for (const input of invalidInputs) {
      queryLog.length = 0;
      const response = await request('materials.list', input);
      const payload = (await response.json()) as ErrorResponse;

      expect(response.status).toBe(400);
      expect(payload.error?.data?.code).toBe('BAD_REQUEST');
      expect(queryLog).toEqual([]);
    }
  });

  it('should return zero matches for an unknown plant code', async () => {
    const response = await request('materials.list', {
      search: 'MAT-000123',
      plantCode: '9999',
    });
    const payload = (await response.json()) as MaterialsResponse;

    expect(response.status).toBe(200);
    expect(payload.result?.data).toMatchObject({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 25,
    });
  });

  it('should treat blank search as unfiltered', async () => {
    const response = await request('materials.list', {
      search: '   ',
      pageSize: 1,
    });
    const payload = (await response.json()) as MaterialsResponse;

    expect(response.status).toBe(200);
    expect(payload.result?.data).toMatchObject({
      total: 5_000,
      page: 1,
      pageSize: 1,
    });
    expect(payload.result?.data?.rows).toHaveLength(1);
  });

  it('should preserve exact fixture decimals and nullable values over HTTP', async () => {
    const [bearingResponse, sydneyResponse, shimResponse] = await Promise.all([
      request('materials.list', { search: 'MAT-000123', plantCode: '4000' }),
      request('materials.list', { search: 'MAT-000123', plantCode: '2000' }),
      request('materials.list', { search: 'MAT-000124' }),
    ]);
    expect(bearingResponse.status).toBe(200);
    expect(sydneyResponse.status).toBe(200);
    expect(shimResponse.status).toBe(200);

    const bearingPayload = (await bearingResponse.json()) as MaterialsResponse;
    const sydneyPayload = (await sydneyResponse.json()) as MaterialsResponse;
    const shimPayload = (await shimResponse.json()) as MaterialsResponse;
    expect(bearingPayload.result?.data?.rows).toHaveLength(1);
    expect(bearingPayload.result?.data?.rows?.[0]).toMatchObject({
      materialNumber: 'MAT-000123',
      unitOfMeasure: 'EA',
      unitPriceAud: '19.95',
      totalQuantityOnHand: '40.000',
      plantBalances: [
        {
          plantCode: '4000',
          quantityOnHand: '12.000',
        },
        {
          plantCode: '3000',
          quantityOnHand: '28.000',
        },
        {
          plantCode: '2000',
          quantityOnHand: '0.000',
        },
      ],
    });
    expect(sydneyPayload.result?.data).toMatchObject({
      rows: [],
      total: 0,
    });
    expect(shimPayload.result?.data?.rows?.[0]).toMatchObject({
      materialNumber: 'MAT-000124',
      unitPriceAud: null,
      totalQuantityOnHand: '0.300',
      updatedAt: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/,
      ),
      plantBalances: [
        { plantCode: '4000', quantityOnHand: '0.100' },
        { plantCode: '3000', quantityOnHand: '0.200' },
      ],
    });

    const rawDecimals = await pool.query<{
      quantity_on_hand: string;
      total_quantity: string;
      unit_price_aud: string | null;
    }>(
      `select s.quantity_on_hand,
              sum(s.quantity_on_hand) over (
                partition by s.material_number
              ) as total_quantity,
              m.unit_price_aud
       from plant_catalogue as s
       join materials as m using (material_number)
       where s.material_number = 'MAT-000124'
       order by s.plant_code`,
    );
    expect(
      rawDecimals.rows.map((row) => [
        typeof row.quantity_on_hand,
        row.quantity_on_hand,
        typeof row.total_quantity,
        row.total_quantity,
      ]),
    ).toEqual([
      ['string', '0.200', 'string', '0.300'],
      ['string', '0.100', 'string', '0.300'],
    ]);

    const rawPrice = await pool.query<{ unit_price_aud: string }>(
      `select unit_price_aud from materials
       where material_number = 'MAT-000123'`,
    );
    expect(typeof rawPrice.rows[0]?.unit_price_aud).toBe('string');
    expect(rawPrice.rows[0]?.unit_price_aud).toBe('19.95');
  });

  it('should hide database details, log one failure, and keep the plant lookup available', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    await pool.query(
      'alter table plant_catalogue rename to plant_catalogue_api_failure_probe',
    );

    try {
      const failedResponse = await request('materials.list', {});
      const failedBody = (await failedResponse.json()) as ErrorResponse;
      expect(failedResponse.status).toBe(500);
      expect(failedBody.error?.message).toBe('Unable to complete the request.');
      expect(failedBody.error?.data?.code).toBe('INTERNAL_SERVER_ERROR');
      expect(failedBody.error?.data).not.toHaveProperty('stack');
      expect(JSON.stringify(failedBody)).not.toContain('plant_catalogue');
      expect(errorLog).toHaveBeenCalledTimes(1);
      expect(errorLog.mock.calls[0]?.[0]).toBe(
        'Unexpected tRPC procedure failure',
      );
      expect(errorLog.mock.calls[0]?.[1]).toMatchObject({
        path: 'materials.list',
        cause: expect.objectContaining({
          message: expect.stringContaining('plant_catalogue'),
        }),
      });

      const plantsResponse = await request('plants.list');
      expect(plantsResponse.status).toBe(200);
    } finally {
      await pool.query(
        'alter table plant_catalogue_api_failure_probe rename to plant_catalogue',
      );
      errorLog.mockRestore();
    }

    const recoveredResponse = await request('materials.list', {
      search: 'MAT-000123',
    });
    expect(recoveredResponse.status).toBe(200);
  });
});
