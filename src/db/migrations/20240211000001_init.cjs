/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
};

/** @param {import('knex').Knex} knex */
exports.down = async function () {};
