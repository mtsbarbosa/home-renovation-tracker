/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('email').notNullable().unique();
    t.string('password_hash').notNullable();
    t.string('name').notNullable();
    t.string('role').notNullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('users');
};
