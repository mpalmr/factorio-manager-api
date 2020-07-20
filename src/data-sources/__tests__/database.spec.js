'use strict';

const DatabaseDataSource = require('../database');

jest.mock('datasource-sql', () => ({
	SQLDataSource: class MockSQLDataSource {
		constructor() {
			this.knex = jest.fn();
			this.knex.transaction = jest.fn().mockResolvedValue({
				commit: jest.fn(),
				rollback: jest.fn(),
			});
		}
	},
}));

test('getUser uses correct key in where clause', async () => {
	const db = new DatabaseDataSource();
	const where = jest.fn().mockReturnValue({
		first: jest.fn().mockResolvedValue({ id: 'mockUserId' }),
	});
	db.knex.mockReturnValue({ where });

	await expect(db.getUser('123')).resolves.toEqual({ id: 'mockUserId' });
	expect(where).toHaveBeenCalledWith('id', '123');

	where.mockClear();
	await expect(db.getUser('BananaBob')).resolves.toEqual({ id: 'mockUserId' });
	expect(where).toHaveBeenCalledWith('username', 'BananaBob');
});
