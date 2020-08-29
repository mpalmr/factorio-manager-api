import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import rmfr from 'rmfr';
import mkdirp from 'mkdirp';
import nock from 'nock';
import * as dateMock from 'jest-date-mock';
import knex from 'knex';
import knexConfig from './knexfile';
import { docker } from './tests/util';

dotenv.config({ path: path.resolve('.env.test') });
jest.setTimeout(60000);

const volumesPath = path.resolve(process.env.VOLUME_ROOT);

async function removeVolumes() {
	return rmfr(volumesPath).catch(ex => (ex.code === 'ENOENT'
		? null : Promise.reject(ex)));
}

async function removeDb() {
	return fs.unlink(path.resolve('db-test.sqlite3'))
		.catch(ex => (ex.code === 'ENOENT' ? null : Promise.reject(ex)));
}

async function removeContainers() {
	const containerIds = await docker.command(`ps -af name=${process.env.CONTAINER_NAMESPACE}`)
		.then(({ containerList }) => containerList
			.map(container => container['container id']));
	return !containerIds.length ? null : docker.command(`rm -vf ${containerIds.join(' ')}`);
}

beforeAll(async () => Promise.all([
	removeContainers(),
	removeVolumes(),
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
]));

beforeEach(async () => mkdirp(volumesPath));

afterEach(() => {
	dateMock.clear();
	nock.cleanAll();
	return Promise.all([
		removeContainers(),
		removeVolumes(),
		Promise.all([
			mockDb('sqlite_master')
				.select('name')
				.then(rows => rows.map(row => row.name)),
			mockDb('user').del()
				.then(() => Promise.all([
					mockDb('session').del(),
					mockDb('game').del(),
				])),
		])
			.then(([tableNames]) => mockDb('sqlite_sequence').whereIn('name', tableNames).del()),
	]);
});

afterAll(async () => removeDb());
