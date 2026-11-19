import { QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import type { AppRouter } from '../../api/trpc/router.ts';

const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export { TRPCProvider, useTRPC };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const trpcClient = createTRPCClient<AppRouter>({
  links: [httpLink({ url: '/api/trpc' })],
});
