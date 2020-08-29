'use strict';

exports.up = async function (knex) {
	await knex.schema.createTable('user', table => {
		table.increments();
		table
			.text('username')
			.notNullable()
			.unique();
		table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
	});

	return Promise.all([
		knex.schema.createTable('session', table => {
			table.increments();
			table
				.integer('user_id')
				.unsigned()
				.references('id')
				.inTable('user');
			table.string('token', 30);
			table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
		}),

		knex.schema.createTable('game', table => {
			table.increments();
			table.string('container_id', 64).notNullable().unique();
			table
				.integer('creator_id')
				.unsigned()
				.references('id')
				.inTable('user');
			table.text('name').notNullable().unique();
			table.text('version').notNullable().defaultTo('latest');
			table
				.integer('port')
				.unsigned()
				.notNullable()
				.unique();
			table.timestamps(true, true);
		}),
	]);
};

exports.down = async function (knex) {
	await Promise.all([
		knex.schema.dropTableIfExists('game'),
		knex.schema.dropTableIfExists('session'),
	]);
	return knex.schema.dropTableIfExists('user');
};
