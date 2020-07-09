'use strict';

const { createToken } = require('../util');

test('createToken', async () => {
	await expect(createToken()).resolves.toHaveLength(88);
});
