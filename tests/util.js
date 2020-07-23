'use strict';

const { ApolloServer } = require('apollo-server');
const { formatError } = require('apollo-errors');
const defaultContext = require('../src/context');
const dataSources = require('../src/data-sources');
const createSchema = require('../src/schema');

exports.constructTestServer = function ({ context = defaultContext } = {}) {
	return new ApolloServer({
		formatError,
		context,
		dataSources,
		schema: createSchema(),
	});
};
