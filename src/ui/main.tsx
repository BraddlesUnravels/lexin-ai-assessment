import '@mantine/core/styles.css';
import 'mantine-datatable/styles.css';
import { MantineProvider } from '@mantine/core';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { router } from './router.tsx';
import { queryClient, TRPCProvider, trpcClient } from './trpc/client.tsx';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('The UI root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="light">
      <QueryClientProvider client={queryClient}>
        <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
          <RouterProvider router={router} />
        </TRPCProvider>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
);
