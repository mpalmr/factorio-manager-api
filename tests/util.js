'use strict';

const { ApolloServer } = require('apollo-server');
const { createTestClient } = require('apollo-server-testing');
const gql = require('graphql-tag');
const { formatError } = require('apollo-errors');
const dateMock = require('jest-date-mock');
const { Docker } = require('docker-cli-js');
const dataSources = require('../src/data-sources');
const createSchema = require('../src/schema');

exports.docker = new Docker({ echo: process.env.DEBUG === 'true' });

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

exports.createTestClientSession = async function (...args) {
	return exports.createUser(...args)
		.then(sessionToken => createTestClient(exports.constructTestServer({
			context: () => ({ sessionToken }),
		})));
};
