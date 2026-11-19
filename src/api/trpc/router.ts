import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db } from '../../db/client.ts';
import * as schema from '../../db/schema.ts';
import { listMaterialsInputSchema } from '../../shared/materials-list-input.ts';
import { listMaterials } from '../../db/queries/materials.ts';
import { listPlants } from '../../db/queries/plants.ts';
import { publicProcedure, router } from './trpc.ts';

type MaterialRegisterDatabase = NodePgDatabase<typeof schema>;

export function createAppRouter(database: MaterialRegisterDatabase = db) {
  return router({
    materials: router({
      list: publicProcedure
        .input(listMaterialsInputSchema)
        .query(({ input }) => listMaterials(input, database)),
    }),
    plants: router({
      list: publicProcedure.query(() => listPlants(database)),
    }),
  });
}

export const appRouter = createAppRouter();

export type AppRouter = typeof appRouter;
