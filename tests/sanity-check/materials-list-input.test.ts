import { describe, expect, it } from 'vitest';
import { listMaterialsInputSchema } from '../../src/shared/materials-list-input.ts';

describe('materials.list input schema', () => {
  it('should trim search and plant code and apply list defaults', () => {
    const input = listMaterialsInputSchema.parse({
      search: '  bearing  ',
      plantCode: ' 4000 ',
    });

    expect(input).toMatchObject({
      search: 'bearing',
      plantCode: '4000',
      sortBy: 'updatedAt',
      sortDirection: 'desc',
      page: 1,
      pageSize: 25,
    });
  });

  it('should reject unknown fields and invalid pagination', () => {
    for (const input of [{ bogus: true }, { page: 0 }, { pageSize: 101 }]) {
      expect(listMaterialsInputSchema.safeParse(input).success).toBe(false);
    }
  });
});
