'use strict';

const { SQLDataSource } = require('datasource-sql');
const sql = require('fake-tag');
const argon = require('argon2');
const { DateTime } = require('luxon');
const snakecaseKeys = require('snakecase-keys');
const camelcaseKeys = require('camelcase-keys');

function toRecord(row) {
	return snakecaseKeys(row);
}

function fromRecord(record) {
	const value = camelcaseKeys(record);
	return !value?.createdAt ? value : {
		...value,
		createdAt: new Date(value.createdAt).toISOString(),
	};
}

function getPort(reservedPorts) {
	const port = Math.floor(Math.random() * (65535 - 1024) + 1024);
	return reservedPorts.includes(port) ? getPort(reservedPorts) : port;
}

module.exports = class DatabaseDataSource extends SQLDataSource {
	lastInsertRowId() {
		return this.db.raw(sql`SELECT last_insert_rowid();`)
			.then(([result]) => result['lastInsertRowid()']);
	}

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
		return this.lastInsertRowId();
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
			.innerJoin('user', 'user.id', 'session.user_id')
			.where('session.token', token)
			.where('session.expires', '>=', Date.now())
			.select('user.id', 'user.username', 'user.created_at')
			.first()
			.then(fromRecord);
	}

	/**
	 * Games
	 */
	async getGameById(id) {
		return this.db('game')
			.where('id', id)
			.first()
			.then(fromRecord);
	}

	async createGame(game, creatorId) {
		let { tcpPort, udpPort } = game;
		if (!tcpPort || !udpPort) {
			const ports = await this.db('game')
				.select('tcp_port', 'udp_port')
				.then(xs => xs.map(fromRecord));
			if (!tcpPort) tcpPort = getPort(ports.map(port => port.tcpPort));
			if (!udpPort) udpPort = getPort(ports.map(port => port.udpPort));
		}

		await this.db('game').insert(toRecord({
			...game,
			tcpPort,
			udpPort,
			creatorId,
		}));

		return this.getGameById(await this.lastInsertRowId());
	}

	async deactivateGame(gameId) {
		return this.db('game')
			.update('deactivated', true)
			.update('tcp_port', null)
			.update('udp_port', null)
			.where('id', gameId);
	}
};
