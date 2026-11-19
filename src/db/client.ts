import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

export const pool = new Pool({ connectionTimeoutMillis: 5_000 });
export const db = drizzle(pool, { schema });
