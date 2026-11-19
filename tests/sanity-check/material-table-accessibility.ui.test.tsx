import { MantineProvider } from '@mantine/core';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MaterialTable } from '../../src/ui/features/materials/MaterialTable.tsx';

describe('material table sorting accessibility', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
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
      matches: media === '',
      media,
      onchange: null,
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

  it('should announce the active sort and activate sortable headers', () => {
    const onSort = vi.fn();
    const renderTable = (
      sortBy: 'materialNumber' | 'updatedAt',
      sortDirection: 'asc' | 'desc',
    ) => {
      act(() => {
        root.render(
          <MantineProvider>
            <MaterialTable
              records={[]}
              fetching={false}
              sortBy={sortBy}
              sortDirection={sortDirection}
              feedback={null}
              onSort={onSort}
            />
          </MantineProvider>,
        );
      });
    };

    renderTable('materialNumber', 'asc');

    const materialHeader = container.querySelector(
      'th[data-accessor="materialNumber"]',
    );
    const updatedAtHeader = container.querySelector(
      'th[data-accessor="updatedAt"]',
    );
    const materialSortButton = materialHeader?.querySelector('button');
    const updatedAtSortButton = updatedAtHeader?.querySelector('button');

    expect(materialHeader?.getAttribute('aria-sort')).toBe('ascending');
    expect(updatedAtHeader?.hasAttribute('aria-sort')).toBe(false);
    expect(materialSortButton?.getAttribute('aria-label')).toContain(
      'sorted ascending',
    );
    expect(updatedAtSortButton?.getAttribute('aria-label')).toContain(
      'not sorted. Activate to sort descending',
    );

    act(() => updatedAtSortButton?.click());
    expect(onSort).toHaveBeenCalledWith('updatedAt');

    renderTable('updatedAt', 'desc');
    expect(
      container
        .querySelector('th[data-accessor="updatedAt"]')
        ?.getAttribute('aria-sort'),
    ).toBe('descending');
    expect(
      container
        .querySelector('th[data-accessor="materialNumber"]')
        ?.hasAttribute('aria-sort'),
    ).toBe(false);
  });
});
