'use strict';

const { SQLDataSource } = require('datasource-sql');
const { DateTime } = require('luxon');
const snakecaseKeys = require('snakecase-keys');
const camelcaseKeys = require('camelcase-keys');
const { createToken } = require('../util');

module.exports = class Database extends SQLDataSource {
	static toRecord(row) {
		return snakecaseKeys(row);
	}

	static fromRecord(record) {
		const row = camelcaseKeys(record);
		return row && {
			...row,
			// SQLite returns strings that aren't ISO timestamps
			createdAt: row.createdAt && new Date(new Date(row.createdAt).toISOString()),
		};
	}

	async createSession(userId, expires = { days: 7 }) {
		const token = await createToken();
		await this.knex('session').insert(Database.toRecord({
			userId,
			token,
			expires: DateTime.utc().plus(expires).toJSDate(),
		}));
		return token;
	}

	session(token) {
		return this.knex('session')
			.where('session.token', token)
			.where('session.expires', '>=', Date.now())
			.where('session.invalidated', false);
	}
};
