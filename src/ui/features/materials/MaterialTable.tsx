import { ActionIcon, Table, Text } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import type { DataTableColumn } from 'mantine-datatable';
import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { MaterialRecord } from './types.ts';

type MaterialTableProps = {
  records: MaterialRecord[];
  fetching: boolean;
  sortBy: 'materialNumber' | 'updatedAt';
  sortDirection: 'asc' | 'desc';
  feedback: ReactNode;
  onSort: (sortBy: 'materialNumber' | 'updatedAt') => void;
};

const australianDateFormatter = new Intl.DateTimeFormat('en-AU', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Australia/Brisbane',
});

function StockDetails({ material }: { material: MaterialRecord }) {
  return (
    <div className="material-stock-details">
      <section aria-label={`Stock by plant for ${material.materialNumber}`}>
        <Text fw={700} mb="xs">
          Stock by plant
        </Text>
        {material.plantBalances.length === 0 ? (
          <Text c="dimmed">No plant balances</Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Plant</Table.Th>
                <Table.Th>On hand</Table.Th>
                <Table.Th>Unit</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {material.plantBalances.map((balance) => (
                <Table.Tr key={balance.plantCode}>
                  <Table.Td>
                    {balance.plantName} · {balance.plantCode}
                  </Table.Td>
                  <Table.Td>{balance.quantityOnHand}</Table.Td>
                  <Table.Td>{material.unitOfMeasure}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </section>
      <div className="material-stock-summary">
        <Text size="sm" c="dimmed">
          Total stock across all plants
        </Text>
        <Text fw={700} size="xl">
          {material.totalQuantityOnHand} {material.unitOfMeasure}
        </Text>
        <Text mt="md">
          <Text component="span" c="dimmed">
            Unit price (AUD)
          </Text>
          {'  '}
          {material.unitPriceAud === null
            ? '—'
            : `AUD ${material.unitPriceAud}`}
        </Text>
      </div>
    </div>
  );
}

export function MaterialTable({
  records,
  fetching,
  sortBy,
  sortDirection,
  feedback,
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
        title: 'Material no.',
        sortable: true,
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
        title: 'Last updated',
        sortable: true,
        noWrap: true,
        render: ({ updatedAt }) =>
          australianDateFormatter.format(new Date(updatedAt)),
      },
    ],
    [expandedMaterialNumber, toggleExpansion],
  );

  return (
    <>
      <div className="material-table-scroll">
        <DataTable
          className="material-register-table"
          idAccessor="materialNumber"
          records={records}
          columns={columns}
          fetching={fetching}
          sortStatus={{ columnAccessor: sortBy, direction: sortDirection }}
          onSortStatusChange={({ columnAccessor }) => {
            if (columnAccessor === 'materialNumber') {
              onSort('materialNumber');
            } else if (columnAccessor === 'updatedAt') {
              onSort('updatedAt');
            }
          }}
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
      {feedback && <div className="material-table-feedback">{feedback}</div>}
    </>
  );
}
