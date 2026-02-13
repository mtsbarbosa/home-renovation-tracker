/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  await knex.schema.createTable('jobs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('description').notNullable();
    t.string('location').notNullable();
    t.string('status').notNullable();
    t.float('cost').notNullable().defaultTo(0);
    t.uuid('contractor_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    t.uuid('homeowner_id').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('job_messages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('job_id').references('id').inTable('jobs').onDelete('CASCADE').notNullable();
    t.uuid('author_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    t.uuid('recipient_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    t.string('message').notNullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
};
  
/** @param {import('knex').Knex} knex */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('jobs');
  await knex.schema.dropTableIfExists('job_messages');
};