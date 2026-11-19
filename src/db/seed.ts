import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { db, pool } from './client.ts';
import { generateSeedData } from './seed-data.ts';
import { materials, plantCatalogue, plants } from './schema.ts';

const INSERT_BATCH_SIZE = 500;

async function insertBatches<T>(
  values: readonly T[],
  insert: (batch: T[]) => Promise<unknown>,
): Promise<void> {
  for (let offset = 0; offset < values.length; offset += INSERT_BATCH_SIZE) {
    await insert(values.slice(offset, offset + INSERT_BATCH_SIZE));
  }
}

export async function seedDatabase(database: typeof db = db): Promise<void> {
  const seed = generateSeedData();

  await database.transaction(async (transaction) => {
    await insertBatches(seed.plants, async (batch) => {
      await transaction.insert(plants).values(batch).onConflictDoNothing();
    });
    await insertBatches(seed.materials, async (batch) => {
      await transaction.insert(materials).values(batch).onConflictDoNothing();
    });
    await insertBatches(seed.plantCatalogue, async (batch) => {
      await transaction
        .insert(plantCatalogue)
        .values(batch)
        .onConflictDoNothing();
    });
  });

  console.info(
    `[db:seed] Seeded ${seed.materials.length} materials and ${seed.plantCatalogue.length} plant balances.`,
  );
}

async function run(): Promise<void> {
  try {
    await seedDatabase();
  } catch (error) {
    console.error('[db:seed] Seed failed.', error);
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
