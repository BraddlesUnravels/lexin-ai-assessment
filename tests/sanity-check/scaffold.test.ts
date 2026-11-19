import { describe, expect, it } from 'vitest';
import { appRouter } from '../../src/api/trpc/router.ts';

describe('scaffold API router', () => {
  it('should return the service and echo the requested probe', async () => {
    const result = await appRouter
      .createCaller({})
      .smoke.check({ probe: 'unit-test' });

    expect(result).toEqual({
      ok: true,
      service: 'api',
      probe: 'unit-test',
    });
  });
});
