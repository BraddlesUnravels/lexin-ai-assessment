export type SortKey = 'materialNumber' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

export function getNextSortDirection(
  active: boolean,
  sortDirection: SortDirection,
  column: SortKey,
) {
  if (!active && column === 'materialNumber') return 'ascending';
  if (!active) return 'descending';
  if (sortDirection === 'asc') return 'descending';
  return 'ascending';
}

export function getSortIndicator(
  active: boolean,
  sortDirection: SortDirection,
) {
  if (!active) return '↕';
  if (sortDirection === 'asc') return '↑';
  return '↓';
}
