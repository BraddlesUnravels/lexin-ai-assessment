import { parseAsString, useQueryStates } from 'nuqs';
import {
  MATERIAL_LIST_DEFAULTS,
  MATERIAL_SORT_DIRECTIONS,
  MATERIAL_SORT_KEYS,
  MATERIAL_STATUSES,
  MATERIAL_TYPES,
} from '../../../shared/material-values.ts';
import type { ListMaterialsInput } from '../../../shared/materials-list-input.ts';

export const materialUrlParsers = {
  search: parseAsString.withDefault(''),
  status: parseAsString.withDefault(''),
  materialType: parseAsString.withDefault(''),
  plantCode: parseAsString.withDefault(''),
  sortBy: parseAsString.withDefault(''),
  sortDirection: parseAsString.withDefault(''),
  page: parseAsString.withDefault(''),
};

export type MaterialUrlValues = {
  search: string;
  status: string;
  materialType: string;
  plantCode: string;
  sortBy: string;
  sortDirection: string;
  page: string;
};

export type MaterialViewState = {
  search: string;
  status: (typeof MATERIAL_STATUSES)[number] | '';
  materialType: (typeof MATERIAL_TYPES)[number] | '';
  plantCode: string;
  sortBy: (typeof MATERIAL_SORT_KEYS)[number];
  sortDirection: (typeof MATERIAL_SORT_DIRECTIONS)[number];
  page: number;
};

export function normalizeSearch(search: string) {
  return search.trim();
}

export function parsePage(value: string) {
  if (!/^\d+$/.test(value)) {
    return MATERIAL_LIST_DEFAULTS.page;
  }

  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0
    ? page
    : MATERIAL_LIST_DEFAULTS.page;
}

function matches<T extends string>(
  value: string,
  allowed: readonly T[],
): value is T {
  return allowed.some((candidate) => candidate === value);
}

export function normalizeMaterialUrlValues(
  values: MaterialUrlValues,
): MaterialViewState {
  return {
    search: values.search,
    status: matches(values.status, MATERIAL_STATUSES) ? values.status : '',
    materialType: matches(values.materialType, MATERIAL_TYPES)
      ? values.materialType
      : '',
    plantCode: values.plantCode,
    sortBy: matches(values.sortBy, MATERIAL_SORT_KEYS)
      ? values.sortBy
      : MATERIAL_LIST_DEFAULTS.sortBy,
    sortDirection: matches(values.sortDirection, MATERIAL_SORT_DIRECTIONS)
      ? values.sortDirection
      : MATERIAL_LIST_DEFAULTS.sortDirection,
    page: parsePage(values.page),
  };
}

export function buildMaterialsListInput(
  state: MaterialViewState,
  search = normalizeSearch(state.search),
): ListMaterialsInput {
  return {
    search: search || undefined,
    ...(state.status ? { status: state.status } : {}),
    ...(state.materialType ? { materialType: state.materialType } : {}),
    ...(state.plantCode.trim() ? { plantCode: state.plantCode.trim() } : {}),
    sortBy: state.sortBy,
    sortDirection: state.sortDirection,
    page: state.page,
    pageSize: MATERIAL_LIST_DEFAULTS.pageSize,
  };
}

export function clearedMaterialUrlValues(
  state: Pick<MaterialViewState, 'sortBy' | 'sortDirection'>,
): Partial<MaterialUrlValues> {
  return {
    search: '',
    status: '',
    materialType: '',
    plantCode: '',
    sortBy: state.sortBy,
    sortDirection: state.sortDirection,
    page: '1',
  };
}

export function getPageNumbers(page: number, pageCount: number) {
  if (pageCount <= 0) {
    return [];
  }

  const size = Math.min(3, pageCount);
  const start = Math.max(1, Math.min(page - 1, pageCount - size + 1));
  return Array.from({ length: size }, (_, index) => start + index);
}

export function getResultRange(
  page: number,
  pageSize: number,
  rowCount: number,
) {
  if (rowCount === 0) {
    return { start: 0, end: 0 };
  }

  const start = (page - 1) * pageSize + 1;
  return { start, end: start + rowCount - 1 };
}

export function useMaterialUrlState() {
  const [values, setValues] = useQueryStates(materialUrlParsers, {
    history: 'replace',
    clearOnDefault: true,
  });

  return {
    state: normalizeMaterialUrlValues(values),
    rawSearch: values.search,
    setValues,
  };
}
