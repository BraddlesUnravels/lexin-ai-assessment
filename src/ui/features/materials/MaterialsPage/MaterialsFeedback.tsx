import { Alert, Button, Stack, Text } from '@mantine/core';
import React from 'react';

type MaterialsFeedbackProps = {
  searchTooLong: boolean;
  searchSettling: boolean;
  hasError: boolean;
  outOfRange: boolean;
  page: number;
  pageCount: number;
  isEmpty: boolean;
  hasFilters: boolean;
  onRetry: () => void;
  onFirstPage: () => void;
  onClear: () => void;
};

export function MaterialsFeedback({
  searchTooLong,
  searchSettling,
  hasError,
  outOfRange,
  page,
  pageCount,
  isEmpty,
  hasFilters,
  onRetry,
  onFirstPage,
  onClear,
}: MaterialsFeedbackProps) {
  if (searchTooLong) {
    return (
      <Alert color="red" title="Search is too long">
        Shorten the search to 200 characters or fewer to load materials.
      </Alert>
    );
  }

  if (searchSettling) {
    return (
      <Text role="status" c="dimmed">
        Updating materials…
      </Text>
    );
  }

  if (hasError) {
    return (
      <Alert color="red" title="Materials could not be loaded">
        <Stack align="flex-start" gap="xs">
          <Text>Check your connection and retry this view.</Text>
          <Button type="button" variant="light" onClick={onRetry}>
            Retry materials
          </Button>
        </Stack>
      </Alert>
    );
  }

  if (outOfRange) {
    return (
      <Stack align="center" gap="xs">
        <Text>
          Page {page} is past the last page ({pageCount}).
        </Text>
        <Button type="button" variant="light" onClick={onFirstPage}>
          Go to first page
        </Button>
      </Stack>
    );
  }

  if (!isEmpty) return undefined;

  return (
    <Stack align="center" gap="xs">
      <Text>No matching materials</Text>
      {hasFilters && (
        <Button type="button" variant="subtle" onClick={onClear}>
          Clear search and filters
        </Button>
      )}
    </Stack>
  );
}
