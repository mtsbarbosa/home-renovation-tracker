/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  await knex.schema.table('jobs', function (table) {
    table.string('status_message').nullable();
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function (knex) {
  await knex.schema.table('jobs', function (table) {
    table.dropColumn('status_message');
  });
};