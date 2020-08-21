import { promisify } from 'util';
import crypto from 'crypto';

const randomBytes = promisify(crypto.randomBytes);

// eslint-disable-next-line
export async function createToken(size = 64) {
	const buffer = await randomBytes(size);
	return buffer
		.toString('base64')
		.replace(/\//g, '_')
		.replace(/\+/g, '-');
}
