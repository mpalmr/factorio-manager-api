'use strict';

const { createTestClient } = require('apollo-server-testing');
const dateMock = require('jest-date-mock');
const gql = require('graphql-tag');
const sql = require('fake-tag');
const knex = require('knex');
const sh = require('shelljs');
const knexConfig = require('../knexfile');
const { constructTestServer, createUser } = require('./util');

let db;
let context;
beforeAll(async () => {
	dateMock.advanceTo(new Date('2005-05-05'));
	db = knex(knexConfig);
	const { mutate } = createTestClient(constructTestServer());
	await createUser(mutate);
	const user = await db('user').where('username', 'BobSaget').first();
	context = () => ({ user });
	dateMock.clear();
});

afterEach(async () => {
	dateMock.clear();
	await db('game').del();
	await db.raw(sql`DELETE FROM sqlite_sequence WHERE name = 'game';`);
	return sh.rm('-rf', 'containers/*/');
});

describe('Game constraints', () => {
	test('name must be at least 3 characters', async () => {
		const { mutate } = createTestClient(constructTestServer({ context }));

		const { data, errors } = await mutate({
			mutation: gql`
				mutation CreateGame($game: CreateGameInput!) {
					createGame(game: $game) {
						id
					}
				}
			`,
			variables: {
				game: { name: 'ay' },
			},
		});

		expect(data).toBe(undefined);
		expect(errors).toHaveLength(1);
		expect(errors[0].extensions.exception.code).toBe('ERR_GRAPHQL_CONSTRAINT_VALIDATION');
		expect(errors[0].extensions.exception.context[0].arg).toBe('minLength');
	});

	test('name cannot be larger than 40 characters', async () => {
		const { mutate } = createTestClient(constructTestServer({ context }));

		const { data, errors } = await mutate({
			mutation: gql`
				mutation CreateGame($game: CreateGameInput!) {
					createGame(game: $game) {
						id
					}
				}
			`,
			variables: {
				game: { name: 'ayyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy' },
			},
		});

		expect(data).toBe(undefined);
		expect(errors).toHaveLength(1);
		expect(errors[0].extensions.exception.code).toBe('ERR_GRAPHQL_CONSTRAINT_VALIDATION');
		expect(errors[0].extensions.exception.context[0].arg).toBe('maxLength');
	});
});

describe('Mutation', () => {
	describe('createGame', async () => {
		dateMock.advanceTo(new Date('1999-04-04'));
		const { mutate } = createTestClient(constructTestServer({ context }));

		const { data, error } = await mutate({
			mutation: gql`
				mutation CreateGame($game: CreateGameInput!) {
					createGame(game: $game) {
						id
						name
						version
						isOnline
						creator {
							id
							username
							createdAt
						}
						createdAt
					}
				}
			`,
			variables: {
				game: { name: 'SuperDuperSlam9000' },
			},
		});

		expect(error).toBe(undefined);
		expect(data.createGame).toEqual({
			id: 1,
			name: 'SuperDuperSlam9000',
			creator: {
				id: 1,
				username: 'BobSaget',
				createdAt: new Date('2005-05-05'),
			},
			createdAt: new Date('1999-04-04'),
		});
	});
});

describe('Query', () => {
	describe('games', () => {
		test('returns a list of games', async () => {
			const { query, mutate } = createTestClient(constructTestServer({ context }));
			dateMock.advanceTo(new Date('2018-01-01'));

			await mutate({
				mutation: gql`
					mutation CreateGames($gameOne: Game!, $gameTwo: Game!, $gameThree: Game!) {
						createGame(game: $gameOne) {
							id
						}
						crateGame(game: $gameTwo) {
							id
						}
						createGame(game: $gameThree) {
							id
						}
					}
				`,
				variables: {
					gameOne: { name: 'Only4MyTruWurkerz' },
					gameTwo: { name: 'JuicinAtFortinos' },
					gameThree: { name: 'KanyeBestBros' },
				},
			});

			const { data, errors } = await query({
				query: gql`
					query GamesIdQuery {
						games {
							id
							name
							version
							creator {
								id
								username
							}
							isOnline
							createdAt
						}
					}
				`,
			});

			expect(errors).toBe(undefined);
			expect(data.games).toHaveLength(3);
		});
	});
});
