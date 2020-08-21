import { createToken } from '../util';

test('createToken', async () => expect(createToken()).resolves.toHaveLength(88));
