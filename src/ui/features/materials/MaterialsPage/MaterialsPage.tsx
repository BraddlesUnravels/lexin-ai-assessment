import { Container, Stack, Title } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback } from 'react';
import { useTRPC } from '../../../trpc/client.tsx';
import { MaterialPagination } from '../MaterialPagination.tsx';
import { MaterialTable } from '../MaterialTable/index.ts';
import { MaterialToolbar } from '../MaterialToolbar.tsx';
import {
  buildMaterialsListInput,
  clearedMaterialUrlValues,
  normalizeSearch,
  useMaterialUrlState,
} from '../url-state.ts';
import type { MaterialUrlValues } from '../url-state.ts';
import { MaterialsFeedback } from './MaterialsFeedback.tsx';
import { MaterialResultCount } from './MaterialResultCount.tsx';
import { getNextSortDirection } from './helpers.ts';
import '../materials.css';

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
  const shouldShowFeedback =
    searchTooLong ||
    searchSettling ||
    materialsQuery.isError ||
    outOfRange ||
    result?.total === 0;
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
      const sortDirection = getNextSortDirection(
        state.sortBy,
        state.sortDirection,
        sortBy,
      );
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
            onSort={changeSort}
          />
          {shouldShowFeedback && (
            <div className="material-table-feedback">
              <MaterialsFeedback
                searchTooLong={searchTooLong}
                searchSettling={searchSettling}
                hasError={materialsQuery.isError}
                outOfRange={outOfRange}
                page={state.page}
                pageCount={pageCount}
                isEmpty={result?.total === 0}
                hasFilters={hasFilters}
                onRetry={() => void materialsQuery.refetch()}
                onFirstPage={goToFirstPage}
                onClear={clearFilters}
              />
            </div>
          )}
          <MaterialResultCount
            result={result}
            searchTooLong={searchTooLong}
            searchSettling={searchSettling}
            isPending={materialsQuery.isPending}
            isFetching={materialsQuery.isFetching}
            hasError={materialsQuery.isError}
          />
        </Stack>
      </Container>
    </main>
  );
}
