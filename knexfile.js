'use strict';

const path = require('path');
const knexStringcase = require('knex-stringcase');

const base = {
	client: 'sqlite3',
	useNullAsDefault: true,
	connection: {
		filename: path.resolve('db.sqlite3'),
		debug: process.env.DEBUG === 'true',
	},
};

module.exports = knexStringcase({
	production: base,
	development: {
		...base,
		connection: {
			...base.connection,
			filename: path.resolve('db-dev.sqlite3'),
		},
	},
	test: {
		...base,
		connection: {
			...base.connection,
			filename: path.resolve('db-test.sqlite3'),
		},
	},
}[process.env.NODE_ENV]);
