import { z } from 'zod';
import { publicProcedure, router } from './trpc.ts';

export const appRouter = router({
  smoke: router({
    check: publicProcedure
      .input(z.object({ probe: z.string() }))
      .query(({ input }) => ({
        ok: true,
        service: 'api' as const,
        probe: input.probe,
      })),
  }),
});

export type AppRouter = typeof appRouter;
