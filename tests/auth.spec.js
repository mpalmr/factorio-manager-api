import { createTestClient } from 'apollo-server-testing';
import gql from 'graphql-tag';
import nock from 'nock';
import { constructTestServer, createTestClientSession } from './util';

describe('Mutation', () => {
	describe('login', () => {
		const LOGIN_MUTATION = gql`
			mutation Login($credentials: Credentials!) {
				login(credentials: $credentials)
			}
		`;

		test('User can log in from legitimate account', async () => {
			nock('https://auth.factorio.com')
				.post('/api-login')
				.reply(200, ['a4d9f3a134a4d9f3a134a4d9f3a134']);

			const { errors, data } = await createTestClient(constructTestServer()).mutate({
				mutation: LOGIN_MUTATION,
				variables: {
					credentials: {
						username: process.env.TEST_FACTORIO_ACCOUNT_USERNAME,
						password: process.env.TEST_FACTORIO_ACCOUNT_PASSWORD,
					},
				},
			});

			expect(errors).not.toBeDefined();
			expect(data).toEqual({ login: expect.stringMatching(/^[\da-f]{30}$/i) });
		});

		test('Responds with error with invalid credentials', async () => {
			nock('https://auth.factorio.com')
				.post('/api-login')
				.reply(401, '401: Unauthorized');

			const { errors, data } = await createTestClient(constructTestServer()).mutate({
				mutation: LOGIN_MUTATION,
				variables: {
					credentials: {
						username: process.env.TEST_FACTORIO_ACCOUNT_USERNAME,
						password: 'thisisnotyourpassword',
					},
				},
			});

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('401: Unauthorized');
			expect(data).toBeNull();
		});
	});

	describe('logout', () => {
		const LOGOUT_MUTATION = gql`
			mutation Logout {
				logout
			}
		`;

		test('Returns null when logged in', async () => {
			const { errors, data } = await createTestClientSession()
				.then(({ mutate }) => mutate({ mutation: LOGOUT_MUTATION }));

			expect(errors).not.toBeDefined();
			expect(data).toEqual({ logout: null });
		});

		test('Must be authenticated', async () => {
			const { errors, data } = await createTestClient(constructTestServer())
				.mutate({ mutation: LOGOUT_MUTATION });

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('Unauthorized');
			expect(data).toEqual({ logout: null });
		});
	});
});
