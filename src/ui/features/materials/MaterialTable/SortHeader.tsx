import React from 'react';
import { getNextSortDirection, getSortIndicator } from './helpers.ts';
import type { SortDirection, SortKey } from './helpers.ts';

export function SortHeader({
  label,
  column,
  sortBy,
  sortDirection,
  onSort,
}: {
  label: string;
  column: SortKey;
  sortBy: SortKey;
  sortDirection: SortDirection;
  onSort: (sortBy: SortKey) => void;
}) {
  const active = sortBy === column;
  const currentDirection = sortDirection === 'asc' ? 'ascending' : 'descending';
  const nextDirection = getNextSortDirection(active, sortDirection, column);
  const sortStatus = active ? `sorted ${currentDirection}` : 'not sorted';
  const indicator = getSortIndicator(active, sortDirection);

  return (
    <button
      type="button"
      className="material-sort-button"
      aria-label={`${label}, ${sortStatus}. Activate to sort ${nextDirection}.`}
      onClick={() => onSort(column)}
    >
      <span>{label}</span>
      <span
        className={`material-sort-indicator${active ? ' is-active' : ''}`}
        aria-hidden="true"
      >
        {indicator}
      </span>
    </button>
  );
}
