'use strict';

const fs = require('fs').promises;
const { createTestClient } = require('apollo-server-testing');
const gql = require('graphql-tag');
const { constructTestServer, createUser } = require('./util');

describe('Mutation', () => {
	describe('createGame', () => {
		beforeEach(() => {
			jest.spyOn(fs, 'access');
			jest.spyOn(fs, 'mkdir');
		});

		test('Must be authenticated', async () => {
			const { mutate } = createTestClient(constructTestServer());
			const { errors, data } = await mutate({
				mutation: gql`
					mutation CreateGameNoAuthentication($game: CreateGameInput!) {
						createGame(game: $game) {
							id
						}
					}
				`,
				variables: {
					game: { name: 'mockGameName' },
				},
			});

			expect(data).toBeNull();
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('You must be logged in to view this resource');
		});
	});

	test('Volume of that name should not exist', async () => {
		fs.access.mockRejectedValue('odam');
		const sessionToken = await createUser();
		const { mutate } = createTestClient(constructTestServer({
			context: () => ({ sessionToken }),
		}));

		const { data, errors } = await mutate({
			mutation: gql`
				mutation CreateGameVolumeExists($game: CreateGameInput!) {
					createGame(game: $game) {
						id
					}
				}
			`,
			variables: {
				game: { name: 'mockGameName' },
			},
		});

		expect(data).toBeNull();
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('Duplicate record found');
	});
});
