'use strict';

const { ApolloServer } = require('apollo-server');
const { formatError } = require('apollo-errors');
const createSchema = require('./schema');
const dataSources = require('./datasources');
const context = require('./context');

module.exports = function createServer() {
	const server = new ApolloServer({
		formatError,
		dataSources,
		context,
		schema: createSchema(),
	});

	server.listen().then(({ url }) => {
		console.info(`Apollo listening on: ${url}`);
	});

	return server;
};
