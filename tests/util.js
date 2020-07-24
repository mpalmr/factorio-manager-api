'use strict';

const { ApolloServer } = require('apollo-server');
const { createTestClient } = require('apollo-server-testing');
const gql = require('graphql-tag');
const { formatError } = require('apollo-errors');
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

const CREATE_USER_MUTATION = gql`
	mutation CreateUserUtil($user: CredentialsInput!) {
		createUser(user: $user)
	}
`;

exports.createUser = async function ({ username = 'BobSaget', password = 'P@ssw0rd' } = {}) {
	const { mutate } = createTestClient(exports.constructTestServer());
	dateMock.advanceTo(new Date('2020-01-01'));
	const { data } = await mutate({
		mutation: CREATE_USER_MUTATION,
		variables: {
			user: { username, password },
		},
	});
	dateMock.clear();
	return data.createUser;
};
