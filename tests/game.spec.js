'use strict';

const path = require('path');
const fs = require('fs').promises;
const { createTestClient } = require('apollo-server-testing');
const gql = require('graphql-tag');
const { createTestClientSession, constructTestServer } = require('./util');

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

	describe('game', () => {
		const GAME_QUERY = gql`
			query GameQuery($id: ID!) {
				game(id: $id) {
					id
					name
					creator {
						id
						username
					}
				}
			}
		`;

		test('Must be authenticated', async () => {
			const { query } = createTestClient(constructTestServer());

			const { errors, data } = await query({
				query: GAME_QUERY,
				variables: { id: '1' },
			});

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('You must be logged in to view this resource');
			expect(data).toBeNull();
		});

		test('Game must exist', async () => {
			const { query } = await createTestClientSession();

			const { errors, data } = await query({
				query: GAME_QUERY,
				variables: { id: '100' },
			});

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('Resource could not be found');
			expect(data).toBeNull();
		});

		test('Successfully gets game', async () => {
			const { query, mutate } = await createTestClientSession();

			const { errors: createErrors, data: createData } = await mutate({
				mutation: gql`
					mutation CreateGame($game: CreateGameInput!) {
						createGame(game: $game) {
							id
						}
					}
				`,
				variables: {
					game: { name: 'mockGame' },
				},
			});
			expect(createErrors).not.toBeDefined();

			const { errors, data } = await query({
				query: GAME_QUERY,
				variables: { id: createData.createGame.id },
			});

			expect(errors).not.toBeDefined();
			expect(data).toEqual({
				game: {
					id: '1',
					name: 'mockGame',
					creator: {
						id: '1',
						username: 'BobSaget',
					},
				},
			});
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

	describe('updateGame', () => {
		const UPDATE_GAME_MUTATION = gql`
			mutation UpdateGame($game: UpdateGameInput!) {
				updateGame(game: $game) {
					id
				}
			}
		`;

		test('Requires authentication', async () => {
			const { mutate } = createTestClient(constructTestServer());

			const { data, errors } = await mutate({
				mutation: UPDATE_GAME_MUTATION,
				variables: {
					game: {
						id: '5',
						name: 'asdf',
					},
				},
			});

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('You must be logged in to view this resource');
			expect(data).toBeNull();
		});

		test('Game must exist', async () => {
			const { mutate } = await createTestClientSession();

			const { data, errors } = await mutate({
				mutation: UPDATE_GAME_MUTATION,
				variables: {
					game: {
						id: '200',
						name: 'wer',
					},
				},
			});

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('Resource could not be found');
			expect(data).toBeNull();
		});

		test('Must own game', async () => {
			const { mutate } = await createTestClientSession();
			const { mutate: otherUserMutate } = await createTestClientSession({ username: 'notBobSaget' });

			const { errors: createErrors, data: createData } = await otherUserMutate({
				mutation: gql`
					mutation CreateGame($game: CreateGameInput!) {
						createGame(game: $game) {
							id
						}
					}
				`,
				variables: {
					game: { name: 'asdf' },
				},
			});
			expect(createErrors).not.toBeDefined();

			const { data, errors } = await mutate({
				mutation: UPDATE_GAME_MUTATION,
				variables: {
					game: {
						id: createData.createGame.id,
						name: 'omgwow',
					},
				},
			});

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('You do not have permissions to view this resource');
			expect(data).toBeNull();
		});
	});

	describe('deleteGame', () => {
		const DELETE_GAME_MUTATION = gql`
			mutation DeleteGame($gameId: ID!) {
				deleteGame(gameId: $gameId)
			}
		`;

		test('Requires authentication', async () => {
			const { mutate } = createTestClient(constructTestServer());

			const { data, errors } = await mutate({
				mutation: DELETE_GAME_MUTATION,
				variables: { gameId: '1' },
			});

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('You must be logged in to view this resource');
			expect(data).toEqual({ deleteGame: null });
		});

		test('Game must exist', async () => {
			const { mutate } = await createTestClientSession();

			const { data, errors } = await mutate({
				mutation: DELETE_GAME_MUTATION,
				variables: { gameId: '100' },
			});

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('Resource could not be found');
			expect(data).toEqual({ deleteGame: null });
		});

		test('Must own game', async () => {
			const { mutate } = await createTestClientSession();
			const { mutate: otherUserMutate } = await createTestClientSession({ username: 'notBobSaget' });

			const { error: createError } = await otherUserMutate({
				mutation: gql`
					mutation CreateGame($game: CreateGameInput!) {
						createGame(game: $game) {
							id
						}
					}
				`,
				variables: {
					game: { name: 'mockGame' },
				},
			});
			expect(createError).not.toBeDefined();

			const { data, errors } = await mutate({
				mutation: DELETE_GAME_MUTATION,
				variables: { gameId: '1' },
			});

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('You do not have permissions to view this resource');
			expect(data).toEqual({ deleteGame: null });
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
				mutation: DELETE_GAME_MUTATION,
				variables: { gameId: createGameData.createGame.id },
			});

			expect(errors).not.toBeDefined();
			expect(data).toEqual({ deleteGame: null });
			expect(await mockDb('game')).toHaveLength(0);
		});
	});
});
