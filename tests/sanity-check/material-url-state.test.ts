import { describe, expect, it } from 'vitest';
import {
  buildMaterialsListInput,
  clearedMaterialUrlValues,
  getPageNumbers,
  normalizeMaterialUrlValues,
  parsePage,
} from '../../src/ui/features/materials/url-state.ts';

describe('material register URL state', () => {
  it('should restore valid filters, sorting, text plant codes, and page from a URL', () => {
    expect(
      normalizeMaterialUrlValues({
        search: '  bearing  ',
        status: 'Active',
        materialType: 'Spare Part',
        plantCode: '004000',
        sortBy: 'materialNumber',
        sortDirection: 'asc',
        page: '2',
      }),
    ).toEqual({
      search: '  bearing  ',
      status: 'Active',
      materialType: 'Spare Part',
      plantCode: '004000',
      sortBy: 'materialNumber',
      sortDirection: 'asc',
      page: 2,
    });
  });

  it('should default malformed enums and reject non-positive or unsafe pages', () => {
    expect(
      normalizeMaterialUrlValues({
        search: '',
        status: 'unknown',
        materialType: 'unknown',
        plantCode: 'unknown-plant',
        sortBy: 'description',
        sortDirection: 'up',
        page: '2.5',
      }),
    ).toEqual({
      search: '',
      status: '',
      materialType: '',
      plantCode: 'unknown-plant',
      sortBy: 'updatedAt',
      sortDirection: 'desc',
      page: 1,
    });
    expect(['', '0', '-1', '1e2', '9007199254740992'].map(parsePage)).toEqual([
      1, 1, 1, 1, 1,
    ]);
  });

  it('should trim search, omit blank filters, and preserve sort when clearing', () => {
    const state = {
      search: '  seal ',
      status: '',
      materialType: '',
      plantCode: '',
      sortBy: 'materialNumber',
      sortDirection: 'asc',
      page: 3,
    } as const;

    expect(buildMaterialsListInput(state)).toEqual({
      search: 'seal',
      sortBy: 'materialNumber',
      sortDirection: 'asc',
      page: 3,
      pageSize: 25,
    });
    expect(clearedMaterialUrlValues(state)).toEqual({
      search: '',
      status: '',
      materialType: '',
      plantCode: '',
      sortBy: 'materialNumber',
      sortDirection: 'asc',
      page: '1',
    });
  });

  it('should keep three consecutive page choices at the final page', () => {
    expect(getPageNumbers(6, 6)).toEqual([4, 5, 6]);
    expect(getPageNumbers(1, 3)).toEqual([1, 2, 3]);
    expect(getPageNumbers(1, 0)).toEqual([]);
  });
});
