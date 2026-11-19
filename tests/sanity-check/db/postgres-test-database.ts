import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Pool } from 'pg';

const execFileAsync = promisify(execFile);
const POSTGRES_IMAGE = 'postgres:17-bookworm';
const POSTGRES_USER = 'material_register_test';
const POSTGRES_PASSWORD = 'material_register_test';
const POSTGRES_DATABASE = 'material_register_test';

async function docker(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('docker', args, {
    encoding: 'utf8',
    timeout: 180_000,
  });
  return stdout.trim();
}

async function waitForPostgres(pool: Pool): Promise<void> {
  const deadline = Date.now() + 60_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      await pool.query('select 1');
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  throw new Error('Timed out waiting for the PostgreSQL test container.', {
    cause: lastError,
  });
}

export type PostgresTestDatabase = {
  containerId: string;
  pool: Pool;
};

export async function startPostgresTestDatabase(): Promise<PostgresTestDatabase> {
  let containerId: string | undefined;
  let pool: Pool | undefined;

  try {
    containerId = await docker([
      'run',
      '--detach',
      '--publish',
      '127.0.0.1::5432',
      '--env',
      `POSTGRES_DB=${POSTGRES_DATABASE}`,
      '--env',
      `POSTGRES_USER=${POSTGRES_USER}`,
      '--env',
      `POSTGRES_PASSWORD=${POSTGRES_PASSWORD}`,
      POSTGRES_IMAGE,
    ]);

    if (!/^[0-9a-f]{12,64}$/i.test(containerId)) {
      throw new Error(
        `Docker returned an invalid container ID: ${containerId}`,
      );
    }

    const portBinding = await docker(['port', containerId, '5432/tcp']);
    const portMatch = /^127\.0\.0\.1:(\d+)$/m.exec(portBinding);
    if (!portMatch) {
      throw new Error(
        `Could not determine the PostgreSQL test port: ${portBinding}`,
      );
    }

    pool = new Pool({
      host: '127.0.0.1',
      port: Number(portMatch[1]),
      database: POSTGRES_DATABASE,
      user: POSTGRES_USER,
      password: POSTGRES_PASSWORD,
      connectionTimeoutMillis: 1_000,
      max: 4,
    });
    await waitForPostgres(pool);

    return { containerId, pool };
  } catch (error) {
    if (pool) {
      await pool.end();
    }
    if (containerId) {
      try {
        const logs = await docker(['logs', containerId]);
        if (logs) {
          console.error('[db:test] PostgreSQL container logs:', logs);
        }
      } catch (logError) {
        console.error(
          '[db:test] Could not read PostgreSQL container logs.',
          logError,
        );
      }
      try {
        await docker(['rm', '--force', containerId]);
      } catch (cleanupError) {
        console.error(
          '[db:test] Could not remove the test container.',
          cleanupError,
        );
      }
    }
    throw new Error('Could not start the PostgreSQL test database.', {
      cause: error,
    });
  }
}

export async function stopPostgresTestDatabase(
  testDatabase: PostgresTestDatabase,
): Promise<void> {
  await testDatabase.pool.end();
  await docker(['rm', '--force', testDatabase.containerId]);
}
