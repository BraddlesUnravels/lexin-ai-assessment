export const MATERIAL_TYPES = [
  'Spare Part',
  'Consumable',
  'Raw Material',
  'Tool',
] as const;

export const MATERIAL_STATUSES = [
  'Active',
  'Pending Review',
  'Obsolete',
] as const;

export const MATERIAL_SORT_KEYS = ['materialNumber', 'updatedAt'] as const;

export const MATERIAL_SORT_DIRECTIONS = ['asc', 'desc'] as const;

export const MATERIAL_LIST_DEFAULTS = {
  page: 1,
  pageSize: 25,
  sortBy: 'updatedAt',
  sortDirection: 'desc',
} as const;
