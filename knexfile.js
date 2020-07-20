'use strict';

const path = require('path');
const knexStringcase = require('knex-stringcase');

module.exports = knexStringcase({
	client: 'sqlite3',
	useNullAsDefault: true,
	connection: {
		filename: path.resolve(`${process.env.NODE_ENV !== 'test' ? 'db' : 'db-test'}.sqlite3`),
		debug: process.env.DEBUG === 'true',
	},
});
