import { createExpressMiddleware } from '@trpc/server/adapters/express';
import type { AnyRouter } from '@trpc/server';
import express from 'express';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { appRouter } from './trpc/router.ts';

export function createApiApp(router: AnyRouter = appRouter) {
  const app = express();

  app.use(
    '/api/trpc',
    createExpressMiddleware({
      router,
      createContext: () => ({}),
      onError({ error, path }) {
        if (error.code === 'INTERNAL_SERVER_ERROR') {
          console.error('Unexpected tRPC procedure failure', {
            path,
            cause: error.cause,
          });
        }
      },
    }),
  );

  return app;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const port = Number(process.env.PORT ?? 3000);
  createApiApp().listen(port, '0.0.0.0', () => {
    console.info(`Express listening on 0.0.0.0:${port}`);
  });
}
