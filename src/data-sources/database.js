import { SQLDataSource } from 'datasource-sql';
import snakecaseKeys from 'snakecase-keys';
import camelcaseKeys from 'camelcase-keys';

export default class Database extends SQLDataSource {
	static toRecord(row) {
		return Array.isArray(row) ? row.map(snakecaseKeys) : snakecaseKeys(row);
	}

	static fromRecord(record) {
		function convert(a) {
			const row = camelcaseKeys(a);
			return !row?.createdAt ? row : {
				...row,
				createdAt: new Date(new Date(row.createdAt).toISOString()),
			};
		}

		return Array.isArray(record) ? record.map(convert) : convert(record);
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

	async getSessionUser(sessionToken) {
		return this.knex('user')
			.innerJoin('session', 'session.user_id', 'user.id')
			.where('session.token', sessionToken)
			.select('user.*')
			.first()
			.then(Database.fromRecord);
	}

	async getContainerId(gameId) {
		return this.knex('game')
			.where('id', gameId)
			.select('container_id')
			.first()
			.then(Database.fromRecord);
	}
}
