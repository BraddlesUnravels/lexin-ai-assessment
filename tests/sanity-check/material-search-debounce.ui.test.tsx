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

describe('material search debounce', () => {
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

  it('should not request the old term on page one when typing through it', async () => {
    const requests: { search?: string; page: number }[] = [];
    const fetchMock: typeof fetch = async (input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname.endsWith('/materials.list')) {
        const request = JSON.parse(url.searchParams.get('input') ?? '{}');
        requests.push(request);
        return Response.json({
          result: {
            data: { rows: [], total: 567, page: request.page, pageSize: 25 },
          },
        });
      }
      return Response.json({ result: { data: [] } });
    };
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const trpcClient = createTRPCClient<AppRouter>({
      links: [httpLink({ url: 'http://localhost/api/trpc', fetch: fetchMock })],
    });
    const urlUpdates: string[] = [];

    await act(async () => {
      root.render(
        <MantineProvider>
          <QueryClientProvider client={queryClient}>
            <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
              <NuqsTestingAdapter
                searchParams="?search=bearing&status=Active&materialType=Spare%20Part&plantCode=4000&sortBy=materialNumber&sortDirection=asc&page=2"
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

    expect(requests.map(({ search, page }) => ({ search, page }))).toEqual([
      { search: 'bearing', page: 2 },
    ]);

    const search = container.querySelector<HTMLInputElement>(
      'input[placeholder="Material no., description or MPN"]',
    );
    expect(search).not.toBeNull();
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    for (const value of [
      'bear',
      'beari',
      'bearin',
      'bearing',
      'bearingx',
      'bearingxy',
      'bearingxyz',
    ]) {
      await act(async () => {
        setValue?.call(search, value);
        search?.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }

    expect(requests.map(({ search, page }) => ({ search, page }))).toEqual([
      { search: 'bearing', page: 2 },
    ]);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });
    expect(requests.map(({ search, page }) => ({ search, page }))).toEqual([
      { search: 'bearing', page: 2 },
      { search: 'bearingxyz', page: 1 },
    ]);
    expect(urlUpdates.at(-1)).toContain('search=bearingxyz');
    expect(urlUpdates.at(-1)).toContain('page=1');

    for (const value of ['bearingxy', 'bearingxyz']) {
      await act(async () => {
        setValue?.call(search, value);
        search?.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }
    expect(container.textContent).toContain('Updating materials');
    expect(requests).toHaveLength(2);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });
    expect(container.textContent).not.toContain('Updating materials');
    expect(requests.at(-1)).toMatchObject({ search: 'bearingxyz', page: 1 });
  });
});
