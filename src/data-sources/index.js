'use strict';

const DatabaseDatasource = require('./database');
const DockerDatasource = require('./docker');

module.exports = function createDockerDataSource(knex) {
	return () => ({
		db: new DatabaseDatasource(knex),
		docker: new DockerDatasource(),
	});
};
