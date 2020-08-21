import { createTestClient } from 'apollo-server-testing';
import * as dateMock from 'jest-date-mock';
import gql from 'graphql-tag';
import { constructTestServer } from './util';

describe('Mutation', () => {
	describe('createUser', () => {
		const CREATE_USER_MUTATION = gql`
			mutation CreateUser($user: CredentialsInput!) {
				createUser(user: $user)
			}
		`;

		test('Creates a user hashing their password', async () => {
			dateMock.advanceTo(new Date('2020-01-01'));
			const { mutate } = createTestClient(constructTestServer());
			const { errors, data } = await mutate({
				mutation: CREATE_USER_MUTATION,
				variables: {
					user: {
						username: 'TheMagicBeanOfOle',
						password: 'P@ssw0rd',
					},
				},
			});

			expect(errors).not.toBeDefined();
			expect(data.createUser).toHaveLength(88);

			const { password_hash } = await mockDb('user')
				.select('passwordHash')
				.where('username', 'TheMagicBeanOfOle')
				.first();
			expect(password_hash).toMatch(/argon/);
		});

		test('Cannot create user that already exists by that username', async () => {
			const { mutate } = createTestClient(constructTestServer());
			await mutate({
				mutation: CREATE_USER_MUTATION,
				variables: {
					user: {
						username: 'TheMagicBeanOfOle',
						password: 'P@ssw0rd',
					},
				},
			});

			const { data, errors } = await mutate({
				mutation: CREATE_USER_MUTATION,
				variables: {
					user: {
						username: 'TheMagicBeanOfOle',
						password: 'P@ssw0rd',
					},
				},
			});

			expect(data).toBeNull();
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('Duplicate record found');
		});
	});

	describe('createAuthToken', () => {
		const AUTH_TOKEN_MUTATION = gql`
			mutation createAuthToken($credentials: CredentialsInput!) {
				createAuthToken(credentials: $credentials)
			}
		`;

		const CREATE_USER_MUTATION = gql`
			mutation CreateUser($user: CredentialsInput!) {
				createUser(user: $user)
			}
		`;

		test('Can get a new authentication token', async () => {
			const { mutate } = createTestClient(constructTestServer());
			await mutate({
				mutation: CREATE_USER_MUTATION,
				variables: {
					user: {
						username: 'BobSaget',
						password: 'P@ssw0rd',
					},
				},
			});

			const { data, errors } = await mutate({
				query: AUTH_TOKEN_MUTATION,
				variables: {
					credentials: {
						username: 'BobSaget',
						password: 'P@ssw0rd',
					},
				},
			});

			expect(errors).not.toBeDefined();
			expect(data.createAuthToken).toHaveLength(88);
		});

		// TODO: Accss protected data
	});

	// TODO: ivalidateAuthToken
});
