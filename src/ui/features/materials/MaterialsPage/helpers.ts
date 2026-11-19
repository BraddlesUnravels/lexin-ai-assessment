import type { MaterialRecord } from '../types.ts';
import { getResultRange } from '../url-state.ts';
import type { MaterialUrlValues } from '../url-state.ts';

export type MaterialsListResult = {
  rows: MaterialRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export type MaterialResultCountState = {
  result: MaterialsListResult | undefined;
  searchTooLong: boolean;
  searchSettling: boolean;
  isPending: boolean;
  isFetching: boolean;
  hasError: boolean;
};

export function getNextSortDirection(
  currentSortBy: MaterialUrlValues['sortBy'],
  currentDirection: MaterialUrlValues['sortDirection'],
  nextSortBy: MaterialUrlValues['sortBy'],
): MaterialUrlValues['sortDirection'] {
  if (currentSortBy !== nextSortBy) {
    return nextSortBy === 'materialNumber' ? 'asc' : 'desc';
  }

  return currentDirection === 'asc' ? 'desc' : 'asc';
}

export function getMaterialResultMessage({
  result,
  searchTooLong,
  searchSettling,
  isPending,
  isFetching,
  hasError,
}: MaterialResultCountState) {
  if (searchTooLong) return 'Search is too long';
  if (searchSettling || isPending || isFetching) return 'Loading materials…';
  if (hasError) return 'Materials unavailable';
  if (!result) return '';
  if (result.total === 0) return '0 materials';

  const noun = result.total === 1 ? 'material' : 'materials';
  if (result.rows.length === 0) return `${result.total} ${noun}`;

  const range = getResultRange(
    result.page,
    result.pageSize,
    result.rows.length,
  );
  return `${range.start}–${range.end} of ${result.total} ${noun}`;
}
