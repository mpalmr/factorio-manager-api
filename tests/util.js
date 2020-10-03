import { promisify } from 'util';
import crypto from 'crypto';
import { ApolloServer } from 'apollo-server';
import { createTestClient } from 'apollo-server-testing';
import gql from 'graphql-tag';
import nock from 'nock';
import * as dateMock from 'jest-date-mock';
import { Docker } from 'docker-cli-js';
import dataSources from '../src/data-sources';
import createSchema from '../src/schema';

const randomBytes = promisify(crypto.randomBytes);

export const docker = new Docker({ echo: process.env.DEBUG === 'true' });

function defaultContext() {
	return { get: jest.fn() };
}

export function constructTestServer({ context = defaultContext } = {}) {
	return new ApolloServer({
		context,
		dataSources,
		schema: createSchema(),
	});
}

export async function createUser({ username = 'BobSaget', password = 'P@ssw0rd' } = {}) {
	const { mutate } = createTestClient(constructTestServer());
	dateMock.advanceTo(new Date('2020-01-01'));

	const buffer = await randomBytes(30);
	const sessionToken = buffer.toString('hex');

	nock('https://auth.factorio.com')
		.post('/api-login')
		.reply(200, [sessionToken]);

	const { errors, data } = await mutate({
		mutation: gql`
			mutation Login($credentials: Credentials!) {
				login(credentials: $credentials)
			}
		`,
		variables: {
			credentials: { username, password },
		},
	});

	if (errors) throw new Error(errors[0]);
	dateMock.clear();
	return data.login;
}

export async function createTestClientSession(...args) {
	const sessionToken = await createUser(...args);
	return createTestClient(constructTestServer({
		context: () => ({ sessionToken }),
	}));
}
