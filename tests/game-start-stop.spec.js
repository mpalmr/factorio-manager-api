'use strict';

const { createTestClient } = require('apollo-server-testing');
const gql = require('graphql-tag');
const { constructTestServer, createUser, docker } = require('./util');
const Database = require('../src/data-sources/database');

describe('startGame', () => {
	const START_GAME_MUTATION = gql`
		mutation StartGame($gameId: ID!) {
			startGame(gameId: $gameId) {
				id
				isOnline
			}
		}
	`;

	test('Requires authentication', async () => {
		const { mutate } = createTestClient(constructTestServer());

		const { data, errors } = await mutate({
			mutation: START_GAME_MUTATION,
			variables: { gameId: '1' },
		});

		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('You must be logged in to view this resource');
		expect(data).toEqual({ startGame: null });
	});

	test('Game must exist', async () => {
		const { mutate } = await createUser()
			.then(sessionToken => createTestClient(constructTestServer({
				context: () => ({ sessionToken }),
			})));

		const { data, errors } = await mutate({
			mutation: START_GAME_MUTATION,
			variables: { gameId: '100' },
		});

		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('Resource could not be found');
		expect(data).toEqual({ startGame: null });
	});

	test('Must own game', async () => {
		const { mutate } = await createUser()
			.then(sessionToken => createTestClient(constructTestServer({
				context: () => ({ sessionToken }),
			})));

		const { errors: createUserErrors } = await mutate({
			mutation: gql`
				mutation CreateUserStartOwnGame($user: CredentialsInput!) {
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
		}));

		const { data, errors } = await mutate({
			mutation: START_GAME_MUTATION,
			variables: { gameId: '1' },
		});

		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('You do not have permissions to view this resource');
		expect(data).toEqual({ startGame: null });
	});

	test('Successfully start game', async () => {
		const { mutate } = await createUser()
			.then(sessionToken => createTestClient(constructTestServer({
				context: () => ({ sessionToken }),
			})));

		const { error: startGameError } = await mutate({
			mutation: gql`
				mutation CreateGameToStart($game: CreateGameInput!) {
					createGame(game: $game) {
						id
					}
				}
			`,
			variables: {
				game: { name: 'gameToStart' },
			},
		});
		expect(startGameError).not.toBeDefined();

		const { data, errors } = await mutate({
			mutation: START_GAME_MUTATION,
			variables: { gameId: '1' },
		});

		expect(errors).not.toBeDefined();
		expect(data).toEqual({ startGame: null });
		return expect(docker.command('ps -f name=fma-test_gameToStart')
			.then(({ containerList }) => containerList[0].created)).resolves.toMatch(/seconds\sago$/);
	});
});

describe('stopGame', () => {
	const STOP_GAME_MUTATION = gql`
		mutation StopGame($gameId: ID!) {
			stopGame(gameId: $gameId) {
				id
				isOnline
			}
		}
	`;

	test('Requires authentication', async () => {
		const { mutate } = createTestClient(constructTestServer());

		const { data, errors } = await mutate({
			mutation: STOP_GAME_MUTATION,
			variables: { gameId: '1' },
		});

		expect(data).toEqual({ stopGame: null });
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('You must be logged in to view this resource');
	});

	test('Game must exist', async () => {
		const { mutate } = await createUser()
			.then(sessionToken => createTestClient(constructTestServer({
				context: () => ({ sessionToken }),
			})));

		const { data, errors } = await mutate({
			mutation: STOP_GAME_MUTATION,
			variables: { gameId: '100' },
		});

		expect(data).toEqual({ stopGame: null });
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('Resource could not be found');
	});

	test('Must own game', async () => {
		const { mutate } = await createUser()
			.then(sessionToken => createTestClient(constructTestServer({
				context: () => ({ sessionToken }),
			})));

		const { errors: createUserErrors } = await mutate({
			mutation: gql`
				mutation CreateUserStopOwnGame($user: CredentialsInput!) {
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
		}));

		const { data, errors } = await mutate({
			mutation: STOP_GAME_MUTATION,
			variables: { gameId: '1' },
		});

		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('You do not have permissions to view this resource');
		expect(data).toEqual({ stopGame: null });
	});

	test('Successfully stop game', async () => {
		const { mutate } = await createUser()
			.then(sessionToken => createTestClient(constructTestServer({
				context: () => ({ sessionToken }),
			})));

		const { error: startGameError } = await mutate({
			mutation: gql`
				mutation CreateGameToStop($game: CreateGameInput!) {
					createGame(game: $game) {
						id
					}
				}
			`,
			variables: {
				game: { name: 'gameToBeStopped' },
			},
		});
		expect(startGameError).not.toBeDefined();

		const { errors: stopErrors } = await mutate({
			mutation: gql`
				mutation StartGameStopSuccess($gameId: ID!) {
					startGame(gameId: $gameId) {
						id
						isOnline
					}
				}
			`,
			variables: { gameId: '1' },
		});

		expect(stopErrors).not.toBeDefined();

		const { data, errors } = await mutate({
			mutation: STOP_GAME_MUTATION,
			variables: { gameId: '1' },
		});

		expect(errors).not.toBeDefined();
		expect(data).toEqual({ stopGame: null });
		return Promise.all([
			expect(docker.command('ps -f name=fma-test_gameToBeStopped')
				.then(({ containerList }) => containerList)).resolves.toHaveLength(0),
			expect(docker.command('ps -af name=fma-tst_gameToBeStopped'))
				.then(({ containerList }) => containerList).resolves.toHaveLength(1),
		]);
	});
});
