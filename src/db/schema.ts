import { sql } from 'drizzle-orm';
import {
  check,
  index,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import {
  MATERIAL_STATUSES,
  MATERIAL_TYPES,
} from '../shared/material-values.ts';

export const materialTypeEnum = pgEnum('material_type', [...MATERIAL_TYPES]);
export const materialStatusEnum = pgEnum('material_status', [
  ...MATERIAL_STATUSES,
]);

export const materials = pgTable(
  'materials',
  {
    materialNumber: text('material_number').primaryKey(),
    description: text('description').notNull(),
    materialType: materialTypeEnum('material_type').notNull(),
    status: materialStatusEnum('status').notNull(),
    manufacturerName: text('manufacturer_name'),
    manufacturerPartNumber: text('manufacturer_part_number'),
    unitOfMeasure: text('unit_of_measure').notNull(),
    unitPriceAud: numeric('unit_price_aud', { precision: 12, scale: 2 }),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
  },
  (table) => [
    check(
      'materials_unit_price_aud_non_negative',
      sql`${table.unitPriceAud} >= 0`,
    ),
  ],
);

export const plants = pgTable('plants', {
  plantCode: text('plant_code').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
});

export const plantCatalogue = pgTable(
  'plant_catalogue',
  {
    materialNumber: text('material_number')
      .notNull()
      .references(() => materials.materialNumber),
    plantCode: text('plant_code')
      .notNull()
      .references(() => plants.plantCode),
    quantityOnHand: numeric('quantity_on_hand', {
      precision: 12,
      scale: 3,
    }).notNull(),
  },
  (table) => [
    primaryKey({
      name: 'plant_catalogue_material_number_plant_code_pk',
      columns: [table.materialNumber, table.plantCode],
    }),
    check(
      'plant_catalogue_quantity_on_hand_non_negative',
      sql`${table.quantityOnHand} >= 0`,
    ),
    index('plant_catalogue_plant_code_idx').on(table.plantCode),
  ],
);
