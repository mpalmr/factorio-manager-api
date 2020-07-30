'use strict';

const { createTestClient } = require('apollo-server-testing');
const gql = require('graphql-tag');
const { constructTestServer, createUser, docker } = require('./util');
const Database = require('../src/data-sources/database');

const CREATE_GAME_MUTATION = gql`
	mutation CreateGame($game: CreateGameInput!) {
		createGame(game: $game) {
			id
		}
	}
`;

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
		expect(data).toBeNull();
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
		expect(data).toBeNull();
	});

	test('Must own game', async () => {
		const { mutate } = await createUser()
			.then(sessionToken => createTestClient(constructTestServer({
				context: () => ({ sessionToken }),
			})));

		const { data: createOtherUserData, errors: createOtherUserErrors } = await mutate({
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
		expect(createOtherUserErrors).not.toBeDefined();

		const { mutate: otherUserMutate } = createTestClient(constructTestServer({
			context: () => ({ sessionToken: createOtherUserData.createUser }),
		}));

		const { errors: createGameErrors } = await otherUserMutate({
			mutation: CREATE_GAME_MUTATION,
			variables: {
				game: { name: 'StartMeUp' },
			},
		});
		expect(createGameErrors).not.toBeDefined();

		const { data, errors } = await mutate({
			mutation: START_GAME_MUTATION,
			variables: { gameId: '1' },
		});

		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('You do not have permissions to view this resource');
		expect(data).toBeNull();
	});

	test('Successfully start game', async () => {
		const { mutate } = await createUser()
			.then(sessionToken => createTestClient(constructTestServer({
				context: () => ({ sessionToken }),
			})));

		const { error: startGameError } = await mutate({
			mutation: CREATE_GAME_MUTATION,
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
		expect(data).toEqual({
			startGame: {
				id: '1',
				isOnline: true,
			},
		});
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

		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('You must be logged in to view this resource');
		expect(data).toBeNull();
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

		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('Resource could not be found');
		expect(data).toBeNull();
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
		expect(data).toBeNull();
	});

	test('Successfully stop game', async () => {
		const { mutate } = await createUser()
			.then(sessionToken => createTestClient(constructTestServer({
				context: () => ({ sessionToken }),
			})));

		const { data: createGameData, error: createGameError } = await mutate({
			mutation: CREATE_GAME_MUTATION,
			variables: {
				game: { name: 'gameToBeStopped' },
			},
		});
		expect(createGameError).not.toBeDefined();
		expect(createGameData).toEqual({
			createGame: { id: '1' },
		});

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
		expect(data).toEqual({
			stopGame: {
				id: '1',
				isOnline: false,
			},
		});
	});
});
