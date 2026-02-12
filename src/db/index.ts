import knex from 'knex';
import type { Knex } from 'knex';

const connection =
  process.env.DATABASE_URL || 'postgres://app:appsecret@localhost:5432/home_renovation';

const config: Knex.Config = {
  client: 'pg',
  connection,
  pool: { min: 1, max: 10 },
};

export const db = knex(config);
