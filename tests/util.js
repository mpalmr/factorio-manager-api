'use strict';

const path = require('path');
const { createTestClient } = require('apollo-server-testing');
const { ApolloServer } = require('apollo-server');
const { formatError } = require('apollo-errors');
const gql = require('graphql-tag');
const knex = require('knex');
const dateMock = require('jest-date-mock');
const knexConfig = require('../knexfile');
const dataSources = require('../src/data-sources');
const createSchema = require('../src/schema');

exports.createTestDb = async function () {
	const db = knex({
		...knexConfig,
		connection: {
			...knexConfig.connection,
			filename: path.resolve('db-test.sqlite3'),
		},
	});
	await db.migrate.latest();
	return db;
};

exports.constructTestServer = function (db, {
	context = () => ({ get: jest.fn() }),
} = {}) {
	return new ApolloServer({
		formatError,
		context,
		dataSources: dataSources(db),
		schema: createSchema(),
	});
};

exports.createUser = async function (mutate) {
	return mutate({
		mutation: gql`
			mutation CreateUser($user: CredentialsInput!) {
				createUser(user: $user)
			}
		`,
		variables: {
			user: {
				username: 'BobSaget',
				password: 'P@ssw0rd',
			},
		},
	})
		.then(({ data, errors }) => {
			if (!data) {
				console.error(errors);
				throw new Error(errors[0]);
			}
			return data;
		});
};

exports.createUserContext = async function (db) {
	dateMock.advanceTo('2005-05-05');
	const { mutate } = createTestClient(exports.constructTestServer(db));
	await exports.createUser(mutate);
	dateMock.clear();
	return db('user').where('username', 'BobSaget').first();
};
