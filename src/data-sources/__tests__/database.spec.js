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

describe('Transactions', () => {
	test('Does not call knex transaction functions on construction but when transaction method is called', async () => {
		const db = new DatabaseDataSource();
		expect(db.knex.transaction).not.toHaveBeenCalled();
		await expect(db.transaction()).resolves.toBe(undefined);
		expect(db.knex.transaction).toHaveBeenCalled();
	});

	test('Cannot start a transaction when one is already taking place', async () => {
		const db = new DatabaseDataSource();
		await db.transaction();
		return expect(db.transaction()).rejects.toThrow('Transaction already in progress');
	});

	test('Cannot commit if no transaction is in progress', async () => {
		const db = new DatabaseDataSource();
		await expect(db.commit()).rejects.toThrow('No transaction is in progress');
		expect(db.knex.transaction).not.toHaveBeenCalled();
	});

	test('Can commit during transaction', async () => {
		const db = new DatabaseDataSource();
		await db.transaction();
		return expect(db.commit()).resolves.toBe(undefined);
	});

	test('Cannot rollback if no transaction is in progress', async () => {
		const db = new DatabaseDataSource();
		await expect(db.rollback()).rejects.toThrow('No transaction is in progress');
		expect(db.knex.transaction).not.toHaveBeenCalled();
	});

	test('Can rollback during transaction', async () => {
		const db = new DatabaseDataSource();
		await db.transaction();
		return expect(db.rollback()).resolves.toBe(undefined);
	});

	test('Resolves to transaction if one is taking place', async () => {
		const db = new DatabaseDataSource();
		expect(db.db).toBe(db.knex);
		await db.transaction();
		expect(db.db).not.toBe(db.knex);
	});
});
