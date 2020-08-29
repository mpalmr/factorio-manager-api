import { createTestClient } from 'apollo-server-testing';
import gql from 'graphql-tag';
import { constructTestServer,	docker,	createTestClientSession } from './util';

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
		const { data, errors } = await createTestClient(constructTestServer()).mutate({
			mutation: START_GAME_MUTATION,
			variables: { gameId: '1' },
		});

		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('Unauthorized');
		expect(data).toBeNull();
	});

	test('Game must exist', async () => {
		const { data, errors } = await createTestClientSession().then(({ mutate }) => mutate({
			mutation: START_GAME_MUTATION,
			variables: { gameId: '100' },
		}));

		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('Game not found');
		expect(data).toBeNull();
	});

	test('Must own game', async () => {
		const gameId = await createTestClientSession({ username: 'NotBobSaget' }).then(async ({ mutate }) => {
			const { errors: createGameErrors, data: createGameData } = await mutate({
				mutation: CREATE_GAME_MUTATION,
				variables: {
					game: { name: 'StopMe' },
				},
			});
			expect(createGameErrors).not.toBeDefined();
			return createGameData.createGame.id;
		});

		const { data, errors } = await createTestClientSession().then(({ mutate }) => mutate({
			mutation: START_GAME_MUTATION,
			variables: { gameId },
		}));

		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('You do not have permissions to view this resource');
		expect(data).toBeNull();
	});

	test('Successfully start game', async () => {
		const { mutate } = await createTestClientSession();

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
		const { data, errors } = await createTestClient(constructTestServer()).mutate({
			mutation: STOP_GAME_MUTATION,
			variables: { gameId: '1' },
		});

		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('Unauthorized');
		expect(data).toBeNull();
	});

	test('Game must exist', async () => {
		const { data, errors } = await createTestClientSession().then(({ mutate }) => mutate({
			mutation: STOP_GAME_MUTATION,
			variables: { gameId: '100' },
		}));

		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('Game not found');
		expect(data).toBeNull();
	});

	test('Must own game', async () => {
		const gameId = await createTestClientSession({ username: 'NotBobSaget' }).then(async ({ mutate }) => {
			const { errors: createGameErrors, data: createGameData } = await mutate({
				mutation: CREATE_GAME_MUTATION,
				variables: {
					game: { name: 'StopMe' },
				},
			});
			expect(createGameErrors).not.toBeDefined();

			const { errors: startGameErrors } = await mutate({
				mutation: gql`
					mutation StartGame($gameId: ID!) {
						startGame(gameId: $gameId) {
							id
						}
					}
				`,
				variables: { gameId: createGameData.createGame.id },
			});
			expect(startGameErrors).not.toBeDefined();

			return createGameData.createGame.id;
		});

		const { data, errors } = await createTestClientSession().then(({ mutate }) => mutate({
			mutation: STOP_GAME_MUTATION,
			variables: { gameId },
		}));

		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('You do not have permissions to view this resource');
		expect(data).toBeNull();
	});

	test('Successfully stop game', async () => {
		const { mutate } = await createTestClientSession();

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
