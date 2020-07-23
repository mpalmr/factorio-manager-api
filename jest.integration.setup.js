'use strict';

const path = require('path');
const fs = require('fs').promises;
const dateMock = require('jest-date-mock');
const knex = require('knex');
const knexConfig = require('./knexfile');

beforeAll(async () => {
	await fs.unlink(path.resolve('db-test.sqlite3'))
		.catch(ex => (ex.code === 'ENOENT' ? null : Promise.reject(ex)));
	global.mockDb = knex(knexConfig);
	return mockDb.migrate.latest();
});

afterEach(() => {
	dateMock.clear();
});

afterAll(async () => mockDb.destroy());
