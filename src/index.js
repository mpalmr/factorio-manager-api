'use strict';

const { ApolloServer } = require('apollo-server');
const { formatError } = require('apollo-errors');
const createSchema = require('./schema');
const dataSources = require('./data-sources');
const context = require('./context');

module.exports = function createServer(knex) {
	const server = new ApolloServer({
		formatError,
		context,
		schema: createSchema(),
		dataSources: dataSources(knex),
	});

	server.listen().then(({ url }) => {
		console.info(`Apollo listening on: ${url}`);
	});

	return server;
};
