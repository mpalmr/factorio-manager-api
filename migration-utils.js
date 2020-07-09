'use strict';

exports.createTableBuilder = function (knex, table) {
	return {
		fk(name, inTable, references) {
			return table
				.integer(name)
				.unsigned()
				.references(references)
				.inTable(inTable);
		},

		createdAt(name = 'created_at') {
			return table
				.timestamp(name)
				.notNullable()
				.defaultTo(knex.fn.now());
		},
	};
};
