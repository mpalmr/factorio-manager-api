'use strict';

const { ApolloServer } = require('apollo-server');
const { formatError } = require('apollo-errors');
const responseCachePlugin = require('apollo-server-plugin-response-cache');
const createSchema = require('./schema');
const dataSources = require('./data-sources');
const context = require('./context');

module.exports = function createServer() {
	const server = new ApolloServer({
		formatError,
		dataSources,
		context,
		schema: createSchema(),
		plugins: [responseCachePlugin()],
	});

	server.listen().then(({ url }) => {
		console.info(`Apollo listening on: ${url}`);
	});

	return server;
};
