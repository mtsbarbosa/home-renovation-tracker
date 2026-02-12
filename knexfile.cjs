const path = require('path');

const connection =
  process.env.DATABASE_URL ||
  'postgres://app:appsecret@localhost:5432/home_renovation';

/** @type {import('knex').Knex.Config} */
module.exports = {
  client: 'pg',
  connection,
  pool: { min: 1, max: 10 },
  migrations: {
    directory: path.join(__dirname, 'src', 'db', 'migrations'),
    extension: 'cjs',
  },
};
