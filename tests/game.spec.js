'use strict';

const { createTestClient } = require('apollo-server-testing');
const dateMock = require('jest-date-mock');
const gql = require('graphql-tag');
const sql = require('fake-tag');
const knex = require('knex');
const knexConfig = require('../knexfile');
const { constructTestServer, createUser } = require('./util');

const CREATE_GAME_MUTATION = gql`
	mutation CreateGame($game: CreateGameInput!) {
		createGame(game: $game) {
			id
		}
	}
`;

let db;
let context;
beforeAll(async () => {
	db = knex(knexConfig);
	const { mutate } = createTestClient(constructTestServer());
	await createUser(mutate);
	const user = await db('user').where('username', 'BobSaget').first();
	context = () => ({ user });
});

afterEach(async () => {
	dateMock.clear();
	await db('game').del();
	return db.raw(sql`DELETE FROM sqlite_sequence WHERE name = 'game';`);
});

describe('Game constraints', () => {
	test('name must be at least 3 characters', async () => {
		const { mutate } = createTestClient(constructTestServer({ context }));

		const { data, errors } = await mutate({
			mutation: CREATE_GAME_MUTATION,
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
			mutation: CREATE_GAME_MUTATION,
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
	test('createGame', async () => {
		const { mutate } = createTestClient(constructTestServer({ context }));

		const { data, error } = await mutate({
			mutation: gql`
				mutation CreateGame($game: CreateGameInput!) {
					createGame(game: $game) {
						id
					}
				}
			`,
		});
	});
});

describe('Query', () => {
	describe('games', () => {
		const GAMES_QUERY = gql`
			query GamesQuery {
				games {
					id
					name
					creator {
						id
					}
					version
					isOnline
					createdAt
				}
			}
		`;

		test('returns a list of games', async () => {
			const { query } = createTestClient(constructTestServer({ context }));

			const { data, errors } = await query({ query: GAMES_QUERY });

			expect(errors).toBe(undefined);
			expect(data.games).toHaveLength(0);
		});
	});
});
