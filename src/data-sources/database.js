'use strict';

const { SQLDataSource } = require('datasource-sql');
const argon = require('argon2');
const { DateTime } = require('luxon');
const snakecaseKeys = require('snakecase-keys');
const camelcaseKeys = require('camelcase-keys');

function toRecord(row) {
	return snakecaseKeys(row);
}

function fromRecord(record) {
	return camelcaseKeys(record);
}

module.exports = class DatabaseDatasource extends SQLDataSource {
	async getUserById(userId) {
		return this.knex('user')
			.where('id', userId)
			.first()
			.then(fromRecord);
	}

	async createUser(user) {
		await this.knex('user').insert(toRecord({ ...user, createdAt: new Date().toISOString() }));
		return this.knex('user')
			.select('id')
			.where('username', user.username)
			.first()
			.then(a => a.id);
	}

	async verifyUser(username, password) {
		const { passwordHash, ...user } = fromRecord(
			await this.knex('user').where('username', username).first(),
		);
		return argon.verify(passwordHash, password) ? user : null;
	}

	createSession(userId, token) {
		return this.knex('session').insert(toRecord({
			userId,
			token,
			expires: DateTime.utc().plus({ days: 7 }).toJSDate(),
		}));
	}

	async getSessionUser(token) {
		return this.knex('session')
			.innerJoin('user', 'user.id', 'session.userId')
			.select('user.*')
			.where('session.token', token)
			.where('session.expires', '<', new Date())
			.first()
			.then(fromRecord);
	}

	async createGame(game, fn = async id => id) {
		return this.knex.transaction(async trx => {
			console.log(game);
			await trx('game').insert(toRecord(game));
			const id = await trx('game')
				.select('id')
				.where('name', game.name)
				.first()
				.then(a => a.id);
			return fn(id);
		});
	}
};
