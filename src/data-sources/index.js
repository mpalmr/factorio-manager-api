'use strict';

const knex = require('knex');
const knexConfig = require('../../knexfile');
const Database = require('./database');
const Docker = require('./docker');
const DockerHub = require('./docker-hub');

module.exports = function createDataSource() {
	return {
		db: new Database(knex(knexConfig)),
		docker: new Docker(),
		dockerHub: new DockerHub(),
	};
};
