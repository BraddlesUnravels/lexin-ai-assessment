import { Alert, Button, Container, Stack, Text, Title } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { useTRPC } from '../../trpc/client.tsx';
import { MaterialPagination } from './MaterialPagination.tsx';
import { MaterialTable } from './MaterialTable.tsx';
import { MaterialToolbar } from './MaterialToolbar.tsx';
import {
  buildMaterialsListInput,
  clearedMaterialUrlValues,
  getResultRange,
  normalizeSearch,
  useMaterialUrlState,
} from './url-state.ts';
import type { MaterialUrlValues } from './url-state.ts';
import './materials.css';

export function MaterialsPage() {
  const trpc = useTRPC();
  const { state, setValues } = useMaterialUrlState();
  const normalizedSearch = normalizeSearch(state.search);
  const [debouncedSearch] = useDebouncedValue(normalizedSearch, 300);
  const searchSettling = normalizedSearch !== debouncedSearch;
  const searchTooLong = normalizedSearch.length > 200;
  const listEnabled = !searchSettling && !searchTooLong;

  const input = buildMaterialsListInput(state, debouncedSearch);
  const materialsQuery = useQuery(
    trpc.materials.list.queryOptions(input, { enabled: listEnabled }),
  );
  const plantsQuery = useQuery(trpc.plants.list.queryOptions());
  const result = listEnabled ? materialsQuery.data : undefined;
  const pageCount = result ? Math.ceil(result.total / result.pageSize) : 0;
  const outOfRange = Boolean(
    result && result.total > 0 && state.page > pageCount,
  );
  const hasFilters = Boolean(
    normalizedSearch ||
      state.status ||
      state.materialType ||
      state.plantCode ||
      state.page > 1,
  );

  const updateView = useCallback(
    (values: Partial<MaterialUrlValues>) => {
      void setValues({ ...values, page: '1' }, { history: 'replace' });
    },
    [setValues],
  );

  const clearFilters = useCallback(() => {
    void setValues(
      clearedMaterialUrlValues({
        sortBy: state.sortBy,
        sortDirection: state.sortDirection,
      }),
      { history: 'replace' },
    );
  }, [setValues, state.sortBy, state.sortDirection]);

  const changeSort = useCallback(
    (sortBy: 'materialNumber' | 'updatedAt') => {
      const sortDirection =
        state.sortBy === sortBy
          ? state.sortDirection === 'asc'
            ? 'desc'
            : 'asc'
          : sortBy === 'materialNumber'
            ? 'asc'
            : 'desc';

      updateView({ sortBy, sortDirection });
    },
    [state.sortBy, state.sortDirection, updateView],
  );

  const navigateToPage = useCallback(
    (page: number) => {
      if (page === state.page || page < 1 || page > pageCount) {
        return;
      }

      void setValues({ page: String(page) }, { history: 'push' });
    },
    [pageCount, setValues, state.page],
  );

  const goToFirstPage = useCallback(() => {
    void setValues({ page: '1' }, { history: 'replace' });
  }, [setValues]);

  let feedback: ReactNode = null;

  if (searchTooLong) {
    feedback = (
      <Alert color="red" title="Search is too long">
        Shorten the search to 200 characters or fewer to load materials.
      </Alert>
    );
  } else if (searchSettling || !listEnabled) {
    feedback = (
      <Text role="status" c="dimmed">
        Updating materials…
      </Text>
    );
  } else if (materialsQuery.isError) {
    feedback = (
      <Alert color="red" title="Materials could not be loaded">
        <Stack align="flex-start" gap="xs">
          <Text>Check your connection and retry this view.</Text>
          <Button
            type="button"
            variant="light"
            onClick={() => void materialsQuery.refetch()}
          >
            Retry materials
          </Button>
        </Stack>
      </Alert>
    );
  } else if (outOfRange) {
    feedback = (
      <Stack align="center" gap="xs">
        <Text>
          Page {state.page} is past the last page ({pageCount}).
        </Text>
        <Button type="button" variant="light" onClick={goToFirstPage}>
          Go to first page
        </Button>
      </Stack>
    );
  } else if (result?.total === 0) {
    feedback = (
      <Stack align="center" gap="xs">
        <Text>No matching materials</Text>
        {hasFilters && (
          <Button type="button" variant="subtle" onClick={clearFilters}>
            Clear search and filters
          </Button>
        )}
      </Stack>
    );
  }

  let resultCount = '';
  if (searchTooLong) {
    resultCount = 'Search is too long';
  } else if (
    searchSettling ||
    materialsQuery.isPending ||
    materialsQuery.isFetching
  ) {
    resultCount = 'Loading materials…';
  } else if (materialsQuery.isError) {
    resultCount = 'Materials unavailable';
  } else if (result) {
    if (result.total === 0) {
      resultCount = '0 materials';
    } else if (result.rows.length === 0) {
      resultCount = `${result.total} ${result.total === 1 ? 'material' : 'materials'}`;
    } else {
      const range = getResultRange(
        result.page,
        result.pageSize,
        result.rows.length,
      );
      resultCount = `${range.start}–${range.end} of ${result.total} ${
        result.total === 1 ? 'material' : 'materials'
      }`;
    }
  }

  return (
    <main className="material-register-page">
      <Container size="xl" className="material-register-panel">
        <Stack gap="md">
          <Title order={1}>Material Register</Title>
          <MaterialToolbar
            state={state}
            plants={plantsQuery.data}
            plantsPending={plantsQuery.isPending}
            plantsError={plantsQuery.isError}
            searchTooLong={searchTooLong}
            hasFilters={hasFilters}
            onSearchChange={(search) => updateView({ search })}
            onStatusChange={(status) => updateView({ status: status ?? '' })}
            onMaterialTypeChange={(materialType) =>
              updateView({ materialType: materialType ?? '' })
            }
            onPlantCodeChange={(plantCode) =>
              updateView({ plantCode: plantCode ?? '' })
            }
            onClear={clearFilters}
            onRetryPlants={() => void plantsQuery.refetch()}
          />
          <MaterialPagination
            page={state.page}
            pageCount={pageCount}
            disabled={
              !result ||
              !listEnabled ||
              materialsQuery.isFetching ||
              materialsQuery.isError ||
              outOfRange
            }
            onNavigate={navigateToPage}
          />
          <MaterialTable
            key={JSON.stringify([
              state.search,
              state.status,
              state.materialType,
              state.plantCode,
              state.sortBy,
              state.sortDirection,
              state.page,
            ])}
            records={result?.rows ?? []}
            fetching={!listEnabled || materialsQuery.isFetching}
            sortBy={state.sortBy}
            sortDirection={state.sortDirection}
            feedback={feedback}
            onSort={changeSort}
          />
          <Text
            className="material-result-count"
            size="sm"
            c="dimmed"
            role="status"
          >
            {resultCount}
          </Text>
        </Stack>
      </Container>
    </main>
  );
}
