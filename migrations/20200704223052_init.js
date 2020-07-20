'use strict';

const { createTableBuilder } = require('../migration-utils');

exports.up = async function (knex) {
	await knex.schema.createTable('user', table => {
		const builder = createTableBuilder(knex, table);
		table.increments();
		table.string('username', 40).notNullable().unique();
		table.text('password_hash').notNullable();
		builder.createdAt('created_at');
	});

	return Promise.all([
		knex.schema.createTable('session', table => {
			const builder = createTableBuilder(knex, table);
			table.increments();
			builder.fk('user_id', 'user', 'id').notNullable();
			table.string('token', 88).notNullable();
			table.datetime('expires').notNullable();
			builder.createdAt();
		}),

		knex.schema.createTable('game', table => {
			const builder = createTableBuilder(knex, table);
			table.increments();
			builder.fk('creator_id', 'user', 'id').notNullable();
			table.string('container_id', 64).notNullable().unique();
			table.text('name').notNullable();
			table.text('version').notNullable().defaultTo('latest');
			table.integer('tcp_port').unsigned().unique();
			table.integer('udp_port').unsigned().unique();
			table.boolean('deactivated').notNullable().defaultTo(false);
			builder.createdAt();
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
