import { z } from 'zod';
import {
  MATERIAL_LIST_DEFAULTS,
  MATERIAL_SORT_DIRECTIONS,
  MATERIAL_SORT_KEYS,
  MATERIAL_STATUSES,
  MATERIAL_TYPES,
} from './material-values.ts';

export const listMaterialsInputSchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((value) => (value === '' ? undefined : value)),
    status: z.enum(MATERIAL_STATUSES).optional(),
    materialType: z.enum(MATERIAL_TYPES).optional(),
    plantCode: z.string().trim().min(1).optional(),
    sortBy: z.enum(MATERIAL_SORT_KEYS).default(MATERIAL_LIST_DEFAULTS.sortBy),
    sortDirection: z
      .enum(MATERIAL_SORT_DIRECTIONS)
      .default(MATERIAL_LIST_DEFAULTS.sortDirection),
    page: z.number().int().positive().default(MATERIAL_LIST_DEFAULTS.page),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(MATERIAL_LIST_DEFAULTS.pageSize),
  })
  .strict();

export type ListMaterialsInput = z.output<typeof listMaterialsInputSchema>;
