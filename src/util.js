'use strict';

const { promisify } = require('util');
const randomBytes = promisify(require('crypto').randomBytes);

exports.createToken = async function (size = 64) {
	const buffer = await randomBytes(size);
	return buffer
		.toString('base64')
		.replace(/\//g, '_')
		.replace(/\+/g, '-');
};
