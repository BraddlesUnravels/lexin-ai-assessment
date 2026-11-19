import { initTRPC } from '@trpc/server';

const t = initTRPC.create({
  errorFormatter({ shape, error }) {
    const data = { ...shape.data };
    delete data.stack;
    return {
      ...shape,
      message:
        error.code === 'INTERNAL_SERVER_ERROR'
          ? 'Unable to complete the request.'
          : shape.message,
      data,
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
