'use strict';

const { ApolloServer } = require('apollo-server');
const { formatError } = require('apollo-errors');
const gql = require('graphql-tag');
const dataSources = require('../src/data-sources');
const createSchema = require('../src/schema');

function defaultContext() {
	return { get: jest.fn() };
}

exports.constructTestServer = function ({ context = defaultContext } = {}) {
	return new ApolloServer({
		formatError,
		context,
		dataSources,
		schema: createSchema(),
	});
};

exports.createUser = async function (mutate) {
	const { data, errors } = await mutate({
		mutation: gql`
			mutation CreateUser($user: CredentialsInput!) {
				createUser(user: $user)
			}
		`,
		variables: {
			usr: {
				username: 'BobSaget',
				password: 'P@ssw0rd',
			},
		},
	});

	if (!data) throw new Error(errors[0]);
	return data;
};
