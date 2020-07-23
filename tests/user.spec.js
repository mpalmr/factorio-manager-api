'use strict';

const { createTestClient } = require('apollo-server-testing');
const dateMock = require('jest-date-mock');
const gql = require('graphql-tag');
const { constructTestServer } = require('./util');

const CREATE_USER_MUTATION = gql`
	mutation CreateUser($user: CredentialsInput!) {
		createUser(user: $user)
	}
`;

describe('typeDefs onstraints', () => {
	describe('CredentialsInput', () => {
		test('username must have a minimum length of 3', async () => {
			const { mutate } = createTestClient(constructTestServer({
				context: () => ({ get: jest.fn() }),
			}));

			const { errors, data } = await mutate({
				mutation: CREATE_USER_MUTATION,
				variables: {
					user: {
						username: 'ay',
						password: 'P@ssw0rd',
					},
				},
			});

			expect(data).toBe(undefined);
			expect(errors).toHaveLength(1);
			expect(errors[0].extensions.exception.code).toBe('ERR_GRAPHQL_CONSTRAINT_VALIDATION');
			expect(errors[0].extensions.exception.context[0].arg).toBe('minLength');
		});

		test('username has a max length of 40', async () => {
			const { mutate } = createTestClient(constructTestServer({
				context: () => ({ get: jest.fn() }),
			}));

			const { errors, data } = await mutate({
				mutation: CREATE_USER_MUTATION,
				variables: {
					user: {
						username: 'ayyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
						password: 'P@ssw0rd',
					},
				},
			});

			expect(data).toBe(undefined);
			expect(errors).toHaveLength(1);
			expect(errors[0].extensions.exception.code).toBe('ERR_GRAPHQL_CONSTRAINT_VALIDATION');
			expect(errors[0].extensions.exception.context[0].arg).toBe('maxLength');
		});

		test('password must have a minLength of 3', async () => {
			const { mutate } = createTestClient(constructTestServer({
				context: () => ({ get: jest.fn() }),
			}));

			const { errors, data } = await mutate({
				mutation: CREATE_USER_MUTATION,
				variables: {
					user: {
						username: 'Worksplopalis',
						password: 'ay',
					},
				},
			});

			expect(data).toBe(undefined);
			expect(errors).toHaveLength(1);
			expect(errors[0].extensions.exception.code).toBe('ERR_GRAPHQL_CONSTRAINT_VALIDATION');
			expect(errors[0].extensions.exception.context[0].arg).toBe('minLength');
		});
	});
});

describe('Create user', () => {
	// beforeEach(async () => {
	// 	await mockDb('user').del();
	// 	return mockDb('sqlite_sequence').where('name', 'user');
	// });

	test('Creates a user hashing their password', async () => {
		dateMock.advanceTo(new Date('2020-01-01'));
		const { mutate } = createTestClient(constructTestServer({
			context: () => ({ get: jest.fn() }),
		}));

		const { errors, data } = await mutate({
			mutation: CREATE_USER_MUTATION,
			variables: {
				user: {
					username: 'TheMagicBeanOfOle',
					password: 'P@ssw0rd',
				},
			},
		});

		expect(errors).toBe(undefined);
		expect(data.createUser).toHaveLength(88);

		const { password_hash } = await mockDb('user')
			.select('passwordHash')
			.where('username', 'TheMagicBeanOfOle')
			.first();
		expect(password_hash).toMatch(/argon/);
	});

	test('Cannot create user that already exists by that username', async () => {
		const { mutate } = createTestClient(constructTestServer({
			context: () => ({ get: jest.fn() }),
		}));

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
		expect(errors[0].message).toContain('SQLITE_CONSTRAINT');
	});
});

describe('Authentication', () => {
	const AUTH_TOKEN_QUERY = gql`
		query GetAuthToken($credentials: CredentialsInput!) {
			authToken(credentials: $credentials)
		}
	`;

	test('Can get a new authentication token', async () => {
		const { query, mutate } = createTestClient(constructTestServer({
			context: () => ({ get: jest.fn() }),
		}));

		await mutate({
			mutation: CREATE_USER_MUTATION,
			variables: {
				user: {
					username: 'BobSaget',
					password: 'P@ssw0rd',
				},
			},
		});

		const { data, errors } = await query({
			query: AUTH_TOKEN_QUERY,
			variables: {
				credentials: {
					username: 'BobSaget',
					password: 'P@ssw0rd',
				},
			},
		});

		expect(errors).toBe(undefined);
		expect(data.authToken).toHaveLength(88);
	});
});
