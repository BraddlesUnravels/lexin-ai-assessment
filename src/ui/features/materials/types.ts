import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../../../api/trpc/router.ts';

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type MaterialRecord = RouterOutputs['materials']['list']['rows'][number];
export type PlantRecord = RouterOutputs['plants']['list'][number];
