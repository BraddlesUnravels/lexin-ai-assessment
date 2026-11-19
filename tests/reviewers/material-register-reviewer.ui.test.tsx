import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpLink } from '@trpc/client';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppRouter } from '../../src/api/trpc/router.ts';
import { MaterialsPage } from '../../src/ui/features/materials/MaterialsPage/index.ts';
import { TRPCProvider } from '../../src/ui/trpc/client.tsx';

type MaterialsRequest = {
  search?: string;
  status?: string;
  materialType?: string;
  plantCode?: string;
  sortBy: string;
  sortDirection: string;
  page: number;
  pageSize: number;
};

describe('Material Register reviewer flows', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.stubGlobal('React', React);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal('matchMedia', (media: string) => ({
      matches: false,
      media,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }));
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function renderPage(
    searchParams: string,
    fetchMock: typeof fetch,
    urlUpdates: string[],
  ) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const trpcClient = createTRPCClient<AppRouter>({
      links: [httpLink({ url: 'http://localhost/api/trpc', fetch: fetchMock })],
    });

    await act(async () => {
      root.render(
        <MantineProvider>
          <QueryClientProvider client={queryClient}>
            <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
              <NuqsTestingAdapter
                searchParams={searchParams}
                hasMemory
                onUrlUpdate={({ queryString }) => urlUpdates.push(queryString)}
              >
                <MaterialsPage />
              </NuqsTestingAdapter>
            </TRPCProvider>
          </QueryClientProvider>
        </MantineProvider>,
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  }

  function createFetchMock(
    requests: MaterialsRequest[],
    total = 567,
  ): typeof fetch {
    return async (input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname.endsWith('/materials.list')) {
        const request = JSON.parse(
          url.searchParams.get('input') ?? '{}',
        ) as MaterialsRequest;
        requests.push(request);
        return Response.json({
          result: {
            data: {
              rows: [],
              total,
              page: request.page,
              pageSize: request.pageSize,
            },
          },
        });
      }

      return Response.json({ result: { data: [] } });
    };
  }

  it('should clear filters on a later page while keeping the selected sort', async () => {
    const requests: MaterialsRequest[] = [];
    const urlUpdates: string[] = [];
    await renderPage(
      '?search=bearing&status=Active&materialType=Spare%20Part&plantCode=4000&sortBy=materialNumber&sortDirection=asc&page=3',
      createFetchMock(requests),
      urlUpdates,
    );

    const clearButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Clear search and filters',
    );
    expect(clearButton).toBeDefined();
    expect(clearButton?.disabled).toBe(false);

    await act(async () => {
      clearButton?.click();
      await new Promise((resolve) => setTimeout(resolve, 350));
    });

    const clearedUrl = new URLSearchParams(urlUpdates.at(-1) ?? '');
    expect(clearedUrl.get('search')).toBeNull();
    expect(clearedUrl.get('status')).toBeNull();
    expect(clearedUrl.get('materialType')).toBeNull();
    expect(clearedUrl.get('plantCode')).toBeNull();
    expect(clearedUrl.get('page')).toBe('1');
    expect(clearedUrl.get('sortBy')).toBe('materialNumber');
    expect(clearedUrl.get('sortDirection')).toBe('asc');
    expect(requests.at(-1)).toEqual({
      sortBy: 'materialNumber',
      sortDirection: 'asc',
      page: 1,
      pageSize: 25,
    });
  });

  it('should return to the first page from a stale URL without losing its filters or sort', async () => {
    const requests: MaterialsRequest[] = [];
    const urlUpdates: string[] = [];
    await renderPage(
      '?search=bearing&status=Active&materialType=Spare%20Part&plantCode=4000&sortBy=materialNumber&sortDirection=asc&page=999999',
      createFetchMock(requests),
      urlUpdates,
    );

    expect(container.textContent).toContain(
      'Page 999999 is past the last page',
    );
    const firstPageButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Go to first page',
    );
    expect(firstPageButton).toBeDefined();

    await act(async () => {
      firstPageButton?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const recoveredUrl = new URLSearchParams(urlUpdates.at(-1) ?? '');
    expect(recoveredUrl.get('search')).toBe('bearing');
    expect(recoveredUrl.get('status')).toBe('Active');
    expect(recoveredUrl.get('materialType')).toBe('Spare Part');
    expect(recoveredUrl.get('plantCode')).toBe('4000');
    expect(recoveredUrl.get('page')).toBe('1');
    expect(recoveredUrl.get('sortBy')).toBe('materialNumber');
    expect(recoveredUrl.get('sortDirection')).toBe('asc');
    expect(requests.at(-1)).toEqual({
      search: 'bearing',
      status: 'Active',
      materialType: 'Spare Part',
      plantCode: '4000',
      sortBy: 'materialNumber',
      sortDirection: 'asc',
      page: 1,
      pageSize: 25,
    });
  });
});
