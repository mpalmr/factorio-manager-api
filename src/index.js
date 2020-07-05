'use strict';

const { ApolloServer } = require('apollo-server');
const { formatError } = require('apollo-errors');
const createSchema = require('./schema');

module.exports = async function createServer() {
	const server = new ApolloServer({
		formatError,
		schema: await createSchema(),
	});

	server.listen().then(({ url }) => {
		console.info(`Apollo listening on: ${url}`);
	});
};
