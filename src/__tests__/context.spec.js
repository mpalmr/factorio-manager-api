'use strict';

const context = require('../context');

test('sessionToken', () => {
	expect(context({
		req: { get: () => undefined },
	}))
		.toEqual({ sessionToken: null });
	expect(context({
		req: { get: () => 'Bearer abc' },
	}))
		.toEqual({ sessionToken: 'abc' });
});
