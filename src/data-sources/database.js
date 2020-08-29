import { SQLDataSource } from 'datasource-sql';
import snakecaseKeys from 'snakecase-keys';
import camelcaseKeys from 'camelcase-keys';

export default class Database extends SQLDataSource {
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

	async createSession(username, token) {
		// First check and see if a user exists for that username
		return this.knex.transaction(async trx => {
			const userRecord = await trx('user')
				.where('username', username)
				.first()
				// If user does not exist insert it into DB
				.then(user => user || trx('user')
					.insert(Database.toRecord({ username }))
					.then(() => trx('user') // and pull it out
						.where('username', username)
						.first()))
				.then(Database.fromRecord);

			// Invalidate all previous sessions
			await trx('session').update('token', null).where('user_id', userRecord.id);

			// Create new session
			return trx('session').insert(Database.toRecord({
				token,
				userId: userRecord.id,
			}));
		});
	}

	async getContainerId(gameId) {
		return this.knex('game')
			.where('id', gameId)
			.select('container_id')
			.first()
			.then(Database.fromRecord);
	}
}
