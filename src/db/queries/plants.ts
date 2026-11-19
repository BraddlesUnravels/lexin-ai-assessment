import { asc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db } from '../client.ts';
import * as schema from '../schema.ts';
import { plants } from '../schema.ts';

type MaterialRegisterDatabase = NodePgDatabase<typeof schema>;

export async function listPlants(database: MaterialRegisterDatabase = db) {
  return database
    .select({
      plantCode: plants.plantCode,
      name: plants.name,
      city: plants.city,
      state: plants.state,
    })
    .from(plants)
    .orderBy(asc(plants.name), asc(plants.plantCode));
}
