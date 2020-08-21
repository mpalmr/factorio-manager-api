import { ApolloServer } from 'apollo-server';
import { createTestClient } from 'apollo-server-testing';
import gql from 'graphql-tag';
import { formatError } from 'apollo-errors';
import * as dateMock from 'jest-date-mock';
import { Docker } from 'docker-cli-js';
import dataSources from '../src/data-sources';
import createSchema from '../src/schema';

export const docker = new Docker({ echo: process.env.DEBUG === 'true' });

function defaultContext() {
	return { get: jest.fn() };
}

export function constructTestServer({ context = defaultContext } = {}) {
	return new ApolloServer({
		formatError,
		context,
		dataSources,
		schema: createSchema(),
	});
}

const CREATE_USER_MUTATION = gql`
	mutation CreateUserUtil($user: CredentialsInput!) {
		createUser(user: $user)
	}
`;

export async function createUser({ username = 'BobSaget', password = 'P@ssw0rd' } = {}) {
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
}

export async function createTestClientSession(...args) {
	const sessionToken = await exports.createUser(...args);
	return createTestClient(constructTestServer({
		context: () => ({ sessionToken }),
	}));
}
