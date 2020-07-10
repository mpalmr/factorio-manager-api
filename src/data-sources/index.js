'use strict';

const knex = require('knex');
const knexConfig = require('../../knexfile');
const DatabaseDatasource = require('./database');
const DockerDatasource = require('./docker');

module.exports = function createDockerDataSource() {
	return {
		db: new DatabaseDatasource(knex(knexConfig)),
		docker: new DockerDatasource(),
	};
};
