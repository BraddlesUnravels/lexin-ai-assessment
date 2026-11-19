import { and, eq, exists, gt, ilike, or, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db } from '../client.ts';
import * as schema from '../schema.ts';
import { materials, plantCatalogue } from '../schema.ts';
import type { ListMaterialsInput } from '../../shared/materials-list-input.ts';

type MaterialRegisterDatabase = NodePgDatabase<typeof schema>;

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export function buildMaterialWhere(
  input: ListMaterialsInput,
  database: MaterialRegisterDatabase = db,
): SQL | undefined {
  const predicates: SQL[] = [];

  if (input.search) {
    const pattern = `%${escapeLikePattern(input.search)}%`;
    const textMatch = or(
      ilike(materials.materialNumber, pattern),
      ilike(materials.description, pattern),
      ilike(materials.manufacturerPartNumber, pattern),
    );
    if (textMatch) predicates.push(textMatch);
  }

  if (input.status) {
    predicates.push(eq(materials.status, input.status));
  }

  if (input.materialType) {
    predicates.push(eq(materials.materialType, input.materialType));
  }

  if (input.plantCode) {
    predicates.push(
      exists(
        database
          .select({ materialNumber: plantCatalogue.materialNumber })
          .from(plantCatalogue)
          .where(
            and(
              eq(plantCatalogue.materialNumber, materials.materialNumber),
              eq(plantCatalogue.plantCode, input.plantCode),
              gt(plantCatalogue.quantityOnHand, '0'),
            ),
          ),
      ),
    );
  }

  return and(...predicates);
}
