'use strict';

require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;
const dateMock = require('jest-date-mock');
const db = require('./tests/db');

beforeAll(async () => {
	await fs.unlink(path.resolve('db-test.sqlite3'))
		.catch(ex => (ex.code === 'ENOENT' ? null : Promise.reject(ex)));
	return db.migrate.latest();
});

afterEach(async () => {
	dateMock.clear();
	await db('session').del();
	await db('user').del();
	return db('sqlite_sequence').del().whereIn('name', ['user', 'session']);
});

afterAll(async () => db.destroy());
