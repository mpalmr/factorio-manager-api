'use strict';

const { createTestClient } = require('apollo-server-testing');
const dateMock = require('jest-date-mock');
const gql = require('graphql-tag');
const sql = require('fake-tag');
const knex = require('knex');
const knexConfig = require('../knexfile');
const { constructTestServer, createUserSession } = require('./util');

const CREATE_GAME_MUTATION = gql`
	mutation CreateGame($game: CreateGameInput!) {
		createGame(game: $game) {
			id
			name
			version
			createdAt
			creator {
				id
			}
		}
	}
`;

let db;
beforeAll(() => {
	db = knex(knexConfig);
});

afterEach(() => {
	dateMock.clear();
});

describe('Game constraints', () => {
	test('name must be at least 3 characters', async () => {
		const { mutate } = createTestClient(constructTestServer());

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
		const { mutate } = createTestClient(constructTestServer());

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
