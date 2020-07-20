'use strict';

const { ApolloServer } = require('apollo-server');
const { formatError } = require('apollo-errors');
const gql = require('graphql-tag');
const dateMock = require('jest-date-mock');
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
	dateMock.advanceTo(new Date('2005-05-05'));
	const { errors } = await mutate({
		mutation: gql`
			mutation CreateUser($user: CredentialsInput!) {
				createUser(user: $user)
			}
		`,
		variables: {
			user: {
				username: 'BobSaget',
				password: 'P@ssw0rd',
			},
		},
	});

	if (errors) throw new Error(errors);
	const context = async () => ({ user: await db('user').where('username', 'BobSaget').first() });
	dateMock.clear();
	return context;
};
