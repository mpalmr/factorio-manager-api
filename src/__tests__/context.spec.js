'use strict';

const context = require('../context');

test('If there is no session token don\'t try to get the session user', async () => {
	const dataSources = {
		db: { getSessionUser: jest.fn().mockResolvedValue('mockUser') },
	};
	await expect(context({
		dataSources,
		req: { get: () => {} },
	}))
		.resolves.toEqual({});
	expect(dataSources.db.getSessionUser).not.toHaveBeenCalled();
});

test('If there is a session token try to get the session user', async () => {
	const dataSources = {
		db: { getSessionUser: jest.fn().mockResolvedValue('mockUser') },
	};
	await expect(context({
		dataSources,
		req: { get: () => 'mockSessionToken' },
	}))
		.resolves.toEqual({ user: 'mockUser' });
	expect(dataSources.db.getSessionUser).toHaveBeenCalled();
});
