import { ActionIcon } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import type { DataTableColumn } from 'mantine-datatable';
import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { MaterialRecord } from '../types.ts';
import { SortHeader } from './SortHeader.tsx';
import { StockDetails } from './StockDetails.tsx';
import type { SortDirection, SortKey } from './helpers.ts';

type MaterialTableProps = {
  records: MaterialRecord[];
  fetching: boolean;
  sortBy: SortKey;
  sortDirection: SortDirection;
  onSort: (sortBy: SortKey) => void;
};

const australianDateFormatter = new Intl.DateTimeFormat('en-AU', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Australia/Brisbane',
});

export function MaterialTable({
  records,
  fetching,
  sortBy,
  sortDirection,
  onSort,
}: MaterialTableProps) {
  const [expandedMaterialNumber, setExpandedMaterialNumber] = useState<
    string | null
  >(null);
  const toggleExpansion = useCallback((materialNumber: string) => {
    setExpandedMaterialNumber((current) =>
      current === materialNumber ? null : materialNumber,
    );
  }, []);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const setTableRef = useCallback((table: HTMLTableElement | null) => {
    tableRef.current = table;
  }, []);

  // Mantine DataTable does not expose props for its generated header cells.
  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    for (const header of table.querySelectorAll<HTMLTableCellElement>(
      'th[data-accessor]',
    )) {
      if (header.dataset.accessor === sortBy) {
        header.setAttribute(
          'aria-sort',
          sortDirection === 'asc' ? 'ascending' : 'descending',
        );
      } else {
        header.removeAttribute('aria-sort');
      }
    }
  }, [sortBy, sortDirection]);

  const columns = useMemo<DataTableColumn<MaterialRecord>[]>(
    () => [
      {
        accessor: 'plantStock',
        title: <span className="visually-hidden">Plant stock details</span>,
        width: 72,
        textAlign: 'center',
        render: (material) => {
          const expanded = expandedMaterialNumber === material.materialNumber;
          return (
            <ActionIcon
              type="button"
              variant="subtle"
              color="dark"
              aria-label={`Plant stock for ${material.materialNumber}`}
              aria-expanded={expanded}
              onClick={() => toggleExpansion(material.materialNumber)}
            >
              <span
                className={`material-disclosure-chevron${expanded ? ' is-expanded' : ''}`}
                aria-hidden="true"
              />
            </ActionIcon>
          );
        },
      },
      {
        accessor: 'materialNumber',
        title: (
          <SortHeader
            label="Material no."
            column="materialNumber"
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={onSort}
          />
        ),
        noWrap: true,
      },
      { accessor: 'description', title: 'Description' },
      { accessor: 'materialType', title: 'Type', noWrap: true },
      { accessor: 'status', title: 'Status', noWrap: true },
      {
        accessor: 'manufacturerName',
        title: 'Manufacturer',
        render: ({ manufacturerName }) => manufacturerName ?? '—',
      },
      {
        accessor: 'manufacturerPartNumber',
        title: 'MPN',
        render: ({ manufacturerPartNumber }) => manufacturerPartNumber ?? '—',
      },
      {
        accessor: 'updatedAt',
        title: (
          <SortHeader
            label="Last updated"
            column="updatedAt"
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={onSort}
          />
        ),
        noWrap: true,
        render: ({ updatedAt }) =>
          australianDateFormatter.format(new Date(updatedAt)),
      },
    ],
    [expandedMaterialNumber, onSort, sortBy, sortDirection, toggleExpansion],
  );

  return (
    <div className="material-table-scroll">
      <DataTable
        className="material-register-table"
        idAccessor="materialNumber"
        records={records}
        columns={columns}
        fetching={fetching}
        tableRef={setTableRef}
        rowExpansion={{
          trigger: 'never',
          allowMultiple: false,
          expanded: {
            recordIds: expandedMaterialNumber ? [expandedMaterialNumber] : [],
          },
          content: ({ record }) => <StockDetails material={record} />,
        }}
        noRecordsText=""
        highlightOnHover
        withTableBorder
        borderRadius="sm"
        horizontalSpacing="md"
        verticalSpacing="sm"
        aria-label="Materials"
      />
    </div>
  );
}
