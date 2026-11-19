import { Table, Text } from '@mantine/core';
import React from 'react';
import type { MaterialRecord } from '../types.ts';

export function StockDetails({ material }: { material: MaterialRecord }) {
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
