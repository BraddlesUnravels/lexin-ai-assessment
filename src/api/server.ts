import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';
import { appRouter } from './trpc/router.ts';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(
  '/api/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext: () => ({}),
  }),
);

app.listen(port, '0.0.0.0', () => {
  console.info(`Express listening on 0.0.0.0:${port}`);
});
