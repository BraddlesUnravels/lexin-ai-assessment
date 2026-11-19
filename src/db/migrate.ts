import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { db, pool } from './client.ts';

export async function applyMigrations(database: typeof db = db): Promise<void> {
  await migrate(database, { migrationsFolder: './src/db/migrations' });
}

async function run(): Promise<void> {
  try {
    await applyMigrations();
    console.info('[db:migrate] Applied pending migrations.');
  } catch (error) {
    console.error('[db:migrate] Migration failed.', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  await run();
}
