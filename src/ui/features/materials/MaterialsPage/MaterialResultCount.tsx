import { Text } from '@mantine/core';
import React from 'react';
import { getMaterialResultMessage } from './helpers.ts';
import type { MaterialResultCountState } from './helpers.ts';

export function MaterialResultCount(props: MaterialResultCountState) {
  return (
    <Text className="material-result-count" size="sm" c="dimmed" role="status">
      {getMaterialResultMessage(props)}
    </Text>
  );
}
