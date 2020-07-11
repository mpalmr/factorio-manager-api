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

module.exports = class DatabaseDataSource extends SQLDataSource {
	/**
	 * Transactions
	 */
	trx = null; // TODO: Ideally make this private

	get db() {
		return this.trx || this.knex;
	}

	// TODO: Only here to appease jest, need to figure out how to get rid of this
	set db(value) {
		if (this.trx) this.trx = value;
		else this.knex = value;
	}

	async transaction() {
		if (this.trx) throw new Error('Transaction already in progress');
		this.trx = await this.knex.transaction();
	}

	async commit() {
		if (!this.trx) throw new Error('No transaction is in progress');
		await this.trx.commit();
		this.trx = null;
	}

	async rollback() {
		if (!this.trx) throw new Error('No transaction is in progress');
		await this.trx.rollback();
		this.trx = null;
	}

	/**
	 * Users and sessions
	 */

	async getUserById(userId) {
		return this.db('user')
			.where('id', userId)
			.first()
			.then(fromRecord);
	}

	async createUser(user) {
		await this.db('user').insert(toRecord({ ...user, createdAt: new Date().toISOString() }));
		return this.db('user')
			.select('id')
			.where('username', user.username)
			.first()
			.then(a => a.id);
	}

	async verifyUser(username, password) {
		const { passwordHash, ...user } = fromRecord(
			await this.db('user').where('username', username).first(),
		);
		return argon.verify(passwordHash, password) ? user : null;
	}

	createSession(userId, token) {
		return this.db('session').insert(toRecord({
			userId,
			token,
			expires: DateTime.utc().plus({ days: 7 }).toJSDate(),
		}));
	}

	async getSessionUser(token) {
		return this.db('session')
			.innerJoin('user', 'user.id', 'session.userId')
			.select('user.*')
			.where('session.token', token)
			.where('session.expires', '<', new Date())
			.first()
			.then(fromRecord);
	}

	/**
	 * Games
	 */

	async createGame(game) {
		await this.db('game').insert(toRecord(game));
		return this.db('game')
			.select('id')
			.where('name', game.name)
			.first()
			.then(a => a.id);
	}
};
