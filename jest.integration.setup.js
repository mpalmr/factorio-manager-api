'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve('.env.test') });
const fs = require('fs').promises;
const rmfr = require('rmfr');
const dateMock = require('jest-date-mock');
const knex = require('knex');
const knexConfig = require('./knexfile');

async function removeDb() {
	return fs.unlink(path.resolve('db-test.sqlite3'))
		.catch(ex => (ex.code === 'ENOENT' ? null : Promise.reject(ex)));
}

const volumesPath = path.resolve(process.env.VOLUME_ROOT);

beforeAll(async () => Promise.all([
	// Prepare DB
	removeDb().then(() => {
		global.mockDb = knex({
			...knexConfig,
			connection: {
				...knexConfig.connection,
				filename: 'db-test.sqlite3',
			},
		});
		return mockDb.migrate.latest();
	}),
	// Prepare volumes folder
	await fs.access(volumesPath)
		.then(() => rmfr(volumesPath))
		.then(() => fs.mkdir(volumesPath))
		.catch(ex => (ex.code === 'ENOENT' ? null : Promise.reject(ex))),
]));

beforeEach(async () => {
	await mockDb('user').del();
	await Promise.all([mockDb('session').del(), mockDb('game').del()]);
	return mockDb('sqlite_sequence').whereIn('name', ['user', 'session', 'game']).del();
});

afterEach(() => {
	dateMock.clear();
});

afterAll(async () => rmfr(volumesPath));

// TODO: This breaks tests for some reason
// afterAll(() => {
// 	await mockDb.destroy();
// 	return removeDb();
// });
