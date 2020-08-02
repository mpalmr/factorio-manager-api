'use strict';

const path = require('path');
const fs = require('fs').promises;
const { createTestClient } = require('apollo-server-testing');
const gql = require('graphql-tag');
const { createTestClientSession, constructTestServer } = require('./util');
const Database = require('../src/data-sources/database');

describe('Query', () => {
	describe('games', () => {
		test('Must be authenticated', async () => {
			const { query } = createTestClient(constructTestServer());
			const { errors, data } = await query({
				query: gql`
					query GamesAuthRequired {
						games {
							id
						}
					}
				`,
			});

			expect(data).toBeNull();
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('You must be logged in to view this resource');
		});

		test('Lists all games', async () => {
			const { query, mutate } = await createTestClientSession();
			const { errors: createErrors } = await mutate({
				mutation: gql`
					mutation CreateGamesForListing($gameOne: CreateGameInput!, $gameTwo: CreateGameInput!) {
						gameOne: createGame(game: $gameOne) {
							id
						}
						gameTwo: createGame(game: $gameTwo) {
							id
						}
					}
				`,
				variables: {
					gameOne: { name: 'containerForListingOne' },
					gameTwo: { name: 'containerForListingTwo' },
				},
			});
			expect(createErrors).not.toBeDefined();

			const { data, errors } = await query({
				query: gql`
					query GameListing {
						games {
							id
							name
						}
					}
				`,
			});

			expect(errors).not.toBeDefined();
			expect(data).toEqual({
				games: [
					{
						id: '1',
						name: 'containerForListingOne',
					},
					{
						id: '2',
						name: 'containerForListingTwo',
					},
				],
			});
		});
	});

	describe('availableVersions', () => {
		test('Returns available versions', async () => {
			const { query } = createTestClient(constructTestServer());
			const { data, errors } = await query({
				query: gql`
					query AvailableVersions {
						availableVersions
					}
				`,
			});

			expect(errors).not.toBeDefined();
			expect(data.availableVersions)
				.toEqual(expect.arrayContaining(['latest', '0.13', '0.13-dev', '0.15.11']));
		});
	});
});

describe('Mutation', () => {
	describe('createGame', () => {
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

		test('Volume of that name should not exist', async () => {
			const [{ mutate }] = await Promise.all([
				await createTestClientSession(),
				fs.mkdir(path.resolve(`${process.env.VOLUME_ROOT}/duplicateNameContainer`)),
			]);

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
			const { mutate } = await createTestClientSession();

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

			expect(errors).not.toBeDefined();
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
			const { mutate } = await createTestClientSession();

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

			expect(errors).not.toBeDefined();
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

	describe('deleteGame', () => {
		test('Requires authentication', async () => {
			const { mutate } = createTestClient(constructTestServer());

			const { data, errors } = await mutate({
				mutation: gql`
					mutation DeleteGameNoAuth($gameId: ID!) {
						deleteGame(gameId: $gameId)
					}
				`,
				variables: { gameId: '1' },
			});

			expect(data).toEqual({ deleteGame: null });
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('You must be logged in to view this resource');
		});

		test('Game must exist', async () => {
			const { mutate } = await createTestClientSession();

			const { data, errors } = await mutate({
				mutation: gql`
					mutation DeleteGameNotFound($gameId: ID!) {
						deleteGame(gameId: $gameId)
					}
				`,
				variables: { gameId: '100' },
			});

			expect(data).toEqual({ deleteGame: null });
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('Resource could not be found');
		});

		test('Must own game', async () => {
			const { mutate } = await createTestClientSession();

			const { errors: createUserErrors } = await mutate({
				mutation: gql`
					mutation CreateUserDeleteOwnGame($user: CredentialsInput!) {
						createUser(user: $user)
					}
				`,
				variables: {
					user: {
						username: 'SomebodyWhoIsNotYou',
						password: 'P@ssw0rd',
					},
				},
			});
			expect(createUserErrors).not.toBeDefined();

			await mockDb('game').insert(Database.toRecord({
				name: 'youDoNotOwnThis',
				containerId: 'someContainerThatIsNotYours',
				creatorId: 2,
				port: 8080,
			}));

			const { data, errors } = await mutate({
				mutation: gql`
					mutation DeleteGameForbidden($gameId: ID!) {
						deleteGame(gameId: $gameId)
					}
				`,
				variables: { gameId: '1' },
			});

			expect(data).toEqual({ deleteGame: null });
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('You do not have permissions to view this resource');
		});

		test('Successful deletion', async () => {
			const { mutate } = await createTestClientSession();

			const { data: createGameData, error: createGameError } = await mutate({
				mutation: gql`
					mutation CreateGameToDelete($game: CreateGameInput!) {
						createGame(game: $game) {
							id
						}
					}
				`,
				variables: {
					game: { name: 'gameToBeDeleted' },
				},
			});
			expect(createGameError).not.toBeDefined();

			const { data, errors } = await mutate({
				mutation: gql`
					mutation DeleteGameSuccess($gameId: ID!) {
						deleteGame(gameId: $gameId)
					}
				`,
				variables: { gameId: createGameData.createGame.id },
			});

			expect(errors).not.toBeDefined();
			expect(data).toEqual({ deleteGame: null });
			expect(await mockDb('game')).toHaveLength(0);
		});
	});
});
