import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
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
} from '../sanity-check/db/postgres-test-database.ts';
import type { PostgresTestDatabase } from '../sanity-check/db/postgres-test-database.ts';

type MaterialsResponse = {
  result?: {
    data?: {
      rows?: { materialNumber: string }[];
      total?: number;
      page?: number;
      pageSize?: number;
    };
  };
};

let testDatabase: PostgresTestDatabase;
let pool: Pool;
let apiServer: Server;
let apiBaseUrl: string;

const filterValues = ['bearing', 'Active', 'Spare Part', '4000'];
const independentFilter = `
  (strpos(lower(m.material_number), lower($1)) > 0
    or strpos(lower(m.description), lower($1)) > 0
    or strpos(lower(coalesce(m.manufacturer_part_number, '')), lower($1)) > 0)
  and m.status = $2
  and m.material_type = $3
  and exists (
    select 1
    from plant_catalogue as stock
    where stock.material_number = m.material_number
      and stock.plant_code = $4
      and stock.quantity_on_hand > 0
  )
`;

describe('Material Register reviewer API flow', () => {
  beforeAll(async () => {
    testDatabase = await startPostgresTestDatabase();
    pool = testDatabase.pool;
    const database = drizzle(pool, { schema });
    await applyMigrations(database);
    await seedDatabase(database);

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
      throw new Error('The reviewer API test server did not bind a TCP port.');
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

  it('should return the independently ordered seeded page for combined filters over HTTP', async () => {
    const input = {
      search: filterValues[0],
      status: filterValues[1],
      materialType: filterValues[2],
      plantCode: filterValues[3],
      page: 2,
      pageSize: 25,
      sortBy: 'updatedAt',
      sortDirection: 'desc',
    };
    const [countResult, expectedPage] = await Promise.all([
      pool.query<{ total: number }>(
        `select count(*)::int as total
         from materials as m
         where ${independentFilter}`,
        filterValues,
      ),
      pool.query<{ material_number: string }>(
        `select m.material_number
         from materials as m
         where ${independentFilter}
         order by m.updated_at desc, m.material_number asc
         limit 25 offset 25`,
        filterValues,
      ),
    ]);

    const response = await fetch(
      `${apiBaseUrl}/materials.list?input=${encodeURIComponent(JSON.stringify(input))}`,
    );
    const payload = (await response.json()) as MaterialsResponse;
    const page = payload.result?.data;
    if (!page) {
      throw new Error('The reviewer API response did not contain page data.');
    }

    const total = countResult.rows[0]?.total;
    if (total === undefined) {
      throw new Error('The independent SQL count did not return a total.');
    }
    expect(response.status).toBe(200);
    expect(page).toMatchObject({ total, page: 2, pageSize: 25 });
    expect(total).toBeGreaterThanOrEqual(76);
    expect(Math.ceil(total / 25)).toBeGreaterThanOrEqual(4);
    expect(page.rows).toHaveLength(25);
    expect(page.rows?.map(({ materialNumber }) => materialNumber)).toEqual(
      expectedPage.rows.map(({ material_number }) => material_number),
    );
  });
});
