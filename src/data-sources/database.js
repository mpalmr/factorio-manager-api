'use strict';

const { SQLDataSource } = require('datasource-sql');
const sql = require('fake-tag');
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
		return this.knex.raw(sql`SELECT last_insert_rowid();`)
			.then(([result]) => result['lastInsertRowid()']);
	}

	/**
	 * Users and sessions
	 */
	async getUser(id) {
		return this.knex('user')
			.where(/^\d+$/.test(id) ? 'id' : 'username', id)
			.first()
			.then(fromRecord);
	}

	async createUser(user) {
		await this.knex('user').insert(toRecord({ ...user, createdAt: new Date().toISOString() }));
		return this.lastInsertRowId();
	}

	createSession(userId, token) {
		console.log(userId, token);
		return this.knex('session').insert(toRecord({
			userId,
			token,
			expires: DateTime.utc().plus({ days: 7 }).toJSDate(),
		}));
	}

	async getSessionUser(token) {
		return this.knex('session')
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
		return this.knex('game')
			.where('id', id)
			.first()
			.then(fromRecord);
	}

	async createGame(game, creatorId) {
		let { tcpPort, udpPort } = game;
		if (!tcpPort || !udpPort) {
			const ports = await this.knex('game')
				.select('tcp_port', 'udp_port')
				.then(xs => xs.map(fromRecord));
			if (!tcpPort) tcpPort = getPort(ports.map(port => port.tcpPort));
			if (!udpPort) udpPort = getPort(ports.map(port => port.udpPort));
		}

		await this.knex('game').insert(toRecord({
			...game,
			tcpPort,
			udpPort,
			creatorId,
		}));

		return this.getGameById(await this.lastInsertRowId());
	}

	async deactivateGame(gameId) {
		return this.knex('game')
			.update('deactivated', true)
			.update('tcp_port', null)
			.update('udp_port', null)
			.where('id', gameId);
	}
};
