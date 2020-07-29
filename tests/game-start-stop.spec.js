'use strict';

const { createTestClient } = require('apollo-server-testing');
const gql = require('graphql-tag');
const { constructTestServer, createUser, docker } = require('./util');
const Database = require('../src/data-sources/database');

describe('startGame', () => {
	test('Requires authentication', async () => {
		const { mutate } = createTestClient(constructTestServer());

		const { data, errors } = await mutate({
			mutation: gql`
				mutation StartGameNoAuth($gameId: ID!) {
					startGame(gameId: $gameId) {
						id
						isOnline
					}
				}
			`,
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
			mutation: gql`
				mutation StartGameNotFound($gameId: ID!) {
					startGame(gameId: $gameId) {
						id
						isOnline
					}
				}
			`,
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
			mutation: gql`
				mutation StartGameForbidden($gameId: ID!) {
					startGame(gameId: $gameId) {
						id
						isOnline
					}
				}
			`,
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
		expect(startGameError).not.toBeDefined();

		const { data, errors } = await mutate({
			mutation: gql`
				mutation StartGameSuccess($gameId: ID!) {
					startGame(gameId: $gameId) {
						id
						isOnline
					}
				}
			`,
			variables: { gameId: '1' },
		});

		expect(errors).not.toBeDefined();
		expect(data).toEqual({ startGame: null });
		return expect(docker.command('ps -f name=fma-test_gameToBeDeleted')
			.then(({ containerList }) => containerList[0].created)).resolves.toMatch(/seconds\sago$/);
	});
});

describe('stopGame', () => {
	test('Requires authentication', async () => {
		const { mutate } = createTestClient(constructTestServer());

		const { data, errors } = await mutate({
			mutation: gql`
				mutation StopGameNoAuth($gameId: ID!) {
					stopGame(gameId: $gameId) {
						id
						isOnline
					}
				}
			`,
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
			mutation: gql`
				mutation StopGameNotFound($gameId: ID!) {
					stopGame(gameId: $gameId) {
						id
						isOnline
					}
				}
			`,
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
			mutation: gql`
				mutation StopGameForbidden($gameId: ID!) {
					stopGame(gameId: $gameId) {
						id
						isOnline
					}
				}
			`,
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
				mutation CreateGameToDelete($game: CreateGameInput!) {
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
			mutation: gql`
				mutation StopGameSuccess($gameId: ID!) {
					stopGame(gameId: $gameId) {
						id
						isOnline
					}
				}
			`,
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
