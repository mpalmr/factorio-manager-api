'use strict';

const path = require('path');
const fs = require('fs').promises;
const { createTestClient } = require('apollo-server-testing');
const dateMock = require('jest-date-mock');
const gql = require('graphql-tag');
const rmfr = require('rmfr');
const { constructTestServer, createUser, docker } = require('./util');

const volumePath = path.resolve(process.env.VOLUME_ROOT);

describe('Mutation', () => {
	describe('createGame', () => {
		afterEach(async () => rmfr(volumePath));

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
					game: { name: 'mustAuthenticateContainer' },
				},
			});

			expect(data).toBeNull();
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('You must be logged in to view this resource');
		});
	});

	test('Volume of that name should not exist', async () => {
		const [sessionToken] = await Promise.all([
			await createUser(),
			fs.mkdir(path.resolve(`${process.env.VOLUME_ROOT}/duplicateNameContainer`)),
		]);
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
				game: { name: 'duplicateNameContainer' },
			},
		});

		expect(data).toBeNull();
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('Duplicate record found');
	});

	test('Successful creation', async () => {
		const sessionToken = await createUser();
		const { mutate } = createTestClient(constructTestServer({
			context: () => ({ sessionToken }),
		}));

		const { data, errors } = await mutate({
			mutation: gql`
				mutation CreateGameSuccess($game: CreateGameInput!) {
					createGame(game: $game) {
						id
						name
						version
						createdAt
					}
				}
			`,
			variables: {
				game: { name: 'successContainer' },
			},
		});

		expect(errors).toBe(undefined);
		expect(data).toMatchObject({
			createGame: {
				id: '1',
				name: 'successContainer',
				version: 'latest',
			},
		});
		expect(data.createGame.createdAt).toBeInstanceOf(Date);
	});

	test('Can retreive creator', async () => {
		const sessionToken = await createUser();
		const { mutate } = createTestClient(constructTestServer({
			context: () => ({ sessionToken }),
		}));

		const { data, errors } = await mutate({
			mutation: gql`
				mutation CreateGameCreator($game: CreateGameInput!) {
					createGame(game: $game) {
						name
						creator {
							id
							username
							createdAt
						}
					}
				}
			`,
			variables: {
				game: { name: 'creatorContainer' },
			},
		});

		expect(errors).toBe(undefined);
		expect(data).toMatchObject({
			createGame: {
				name: 'creatorContainer',
				creator: {
					id: '1',
					username: 'BobSaget',
				},
			},
		});
		expect(data.createGame.creator.createdAt).toBeInstanceOf(Date);
	});
});
