import { asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db } from '../client.ts';
import * as schema from '../schema.ts';
import { materials, plantCatalogue, plants } from '../schema.ts';
import type { ListMaterialsInput } from '../../shared/materials-list-input.ts';
import { buildMaterialWhere } from './material-where.ts';

type MaterialRegisterDatabase = NodePgDatabase<typeof schema>;

export async function listMaterials(
  input: ListMaterialsInput,
  database: MaterialRegisterDatabase = db,
) {
  const where = buildMaterialWhere(input, database);
  const countQuery = database.select({ total: count() }).from(materials);
  const countRows = where ? await countQuery.where(where) : await countQuery;
  const countRow = countRows[0];
  if (!countRow) {
    throw new Error('The material count query returned no row.');
  }
  const total = countRow.total;

  const sortColumn =
    input.sortBy === 'materialNumber'
      ? materials.materialNumber
      : materials.updatedAt;
  const requestedOrder =
    input.sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn);
  const orderBy =
    input.sortBy === 'updatedAt'
      ? [requestedOrder, asc(materials.materialNumber)]
      : [requestedOrder];

  const materialQuery = database
    .select({
      materialNumber: materials.materialNumber,
      description: materials.description,
      materialType: materials.materialType,
      status: materials.status,
      manufacturerName: materials.manufacturerName,
      manufacturerPartNumber: materials.manufacturerPartNumber,
      unitOfMeasure: materials.unitOfMeasure,
      unitPriceAud: materials.unitPriceAud,
      updatedAt: materials.updatedAt,
    })
    .from(materials);
  const materialRows = await (
    where ? materialQuery.where(where) : materialQuery
  )
    .orderBy(...orderBy)
    .limit(input.pageSize)
    .offset((input.page - 1) * input.pageSize);

  if (materialRows.length === 0) {
    return {
      rows: [],
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  const pageMaterialNumbers = materialRows.map((row) => row.materialNumber);
  const totalQuantityOnHand = sql<string>`
    sum(${plantCatalogue.quantityOnHand})
      over (partition by ${plantCatalogue.materialNumber})
  `.mapWith(String);
  const balanceRows = await database
    .select({
      materialNumber: plantCatalogue.materialNumber,
      plantCode: plants.plantCode,
      plantName: plants.name,
      city: plants.city,
      state: plants.state,
      quantityOnHand: plantCatalogue.quantityOnHand,
      totalQuantityOnHand,
    })
    .from(plantCatalogue)
    .innerJoin(plants, eq(plantCatalogue.plantCode, plants.plantCode))
    .where(inArray(plantCatalogue.materialNumber, pageMaterialNumbers))
    .orderBy(plantCatalogue.materialNumber, plants.name, plants.plantCode);

  const balancesByMaterial = new Map<
    string,
    {
      totalQuantityOnHand: string;
      plantBalances: Array<{
        plantCode: string;
        plantName: string;
        city: string;
        state: string;
        quantityOnHand: string;
      }>;
    }
  >();

  for (const balance of balanceRows) {
    let materialStock = balancesByMaterial.get(balance.materialNumber);
    if (!materialStock) {
      materialStock = {
        totalQuantityOnHand: balance.totalQuantityOnHand,
        plantBalances: [],
      };
      balancesByMaterial.set(balance.materialNumber, materialStock);
    }

    materialStock.plantBalances.push({
      plantCode: balance.plantCode,
      plantName: balance.plantName,
      city: balance.city,
      state: balance.state,
      quantityOnHand: balance.quantityOnHand,
    });
  }

  return {
    rows: materialRows.map((material) => {
      const stock = balancesByMaterial.get(material.materialNumber);
      return {
        ...material,
        totalQuantityOnHand: stock?.totalQuantityOnHand ?? '0',
        plantBalances: stock?.plantBalances ?? [],
      };
    }),
    total,
    page: input.page,
    pageSize: input.pageSize,
  };
}
