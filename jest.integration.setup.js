'use strict';

const path = require('path');
const fs = require('fs').promises;
const dateMock = require('jest-date-mock');
const knex = require('knex');
const knexConfig = require('./knexfile');

async function removeDb() {
	return fs.unlink(path.resolve('db-test.sqlite3'))
		.catch(ex => (ex.code === 'ENOENT' ? null : Promise.reject(ex)));
}

beforeAll(async () => {
	await removeDb();
	global.mockDb = knex({
		...knexConfig,
		connection: {
			...knexConfig.connection,
			filename: 'db-test.sqlite3',
		},
	});
	return mockDb.migrate.latest();
});

beforeEach(async () => {
	await mockDb('user').del();
	await Promise.all([mockDb('session').del(), mockDb('game').del()]);
	return mockDb('sqlite_sequence').whereIn('name', ['user', 'session', 'game']).del();
});

afterEach(() => {
	dateMock.clear();
});

// TODO: This breaks tests for some reason
// afterAll(() => {
// 	await mockDb.destroy();
// 	return removeDb();
// });
