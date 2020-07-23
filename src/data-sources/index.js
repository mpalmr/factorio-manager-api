'use strict';

const knex = require('knex');
const knexConfig = require('../../knexfile');
const Database = require('./database');
const Docker = require('./docker');

module.exports = function createDataSource() {
	return {
		db: new Database(knex(knexConfig)),
		docker: new Docker(),
	};
};
