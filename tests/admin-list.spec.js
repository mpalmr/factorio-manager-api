import { createTestClient } from 'apollo-server-testing';
import gql from 'graphql-tag';
import { constructTestServer, createTestClientSession } from './util';

const CREATE_GAME_MUTATION = gql`
	mutation CreateGame($game: CreateGameInput!) {
		createGame(game: $game) {
			id
			admins {
				id
				username
			}
		}
	}
`;

test('Games by default has creator as admin', async () => {
	const { data, errors } = await createTestClientSession().then(({ mutate }) => mutate({
		mutation: CREATE_GAME_MUTATION,
		variables: {
			game: { name: 'adminlistmebro' },
		},
	}));

	expect(errors).not.toBeDefined();
	expect(data).toEqual({
		createGame: {
			id: expect.stringMatching(/^\d+$/),
			admins: [{
				id: expect.stringMatching(/^\d+$/),
				username: 'BobSaget',
			}],
		},
	});
});

describe('Mutation', () => {
	describe('addGameAdmin', () => {
		const ADD_ADMIN_MUTATION = gql`
			mutation AddAdmin($gameId: ID!, $username: String!) {
				addGameAdmin(gameId: $gameId, username: $username) {
					id
					admins
				}
			}
		`;

		test('Requires authentication', async () => {
			const { data, errors } = await createTestClient(constructTestServer()).mutate({
				mutation: ADD_ADMIN_MUTATION,
				variables: {
					gameId: '1',
					username: 'RaunchMan',
				},
			});

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('Unauthorized');
			expect(data).toBeNull();
		});

		test('Game must exist', async () => {
			const { data, errors } = await createTestClientSession().then(({ mutate }) => mutate({
				mutation: ADD_ADMIN_MUTATION,
				variables: {
					gameId: 'iDoNotExist',
					username: 'RanchMan',
				},
			}));

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('Game not found');
			expect(data).toBeNull();
		});

		// test('Successfully add user as admin', async () => {
		// 	await createTestClientSession({ username: 'NotBobSaget' });
		// 	const {data, errors} = await Promise.all([
		// 		createTestClientSession().then(({ mutate }) => mutate({
		// 			mutation:
		// 		})),
		// 	]);
		// });
	});

	// describe('removeGameAdmin', () => {});
});
