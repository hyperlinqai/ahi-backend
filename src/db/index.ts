import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { config } from '../config';

export const pool = new Pool({
  connectionString: config.dbUrl,
  max: 20
});

export const db = drizzle(pool, { schema });

export default db;
