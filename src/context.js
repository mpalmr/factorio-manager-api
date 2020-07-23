'use strict';

module.exports = function context({ req }) {
	const sessionToken = req.get('Authorization') || null;
	return { sessionToken: sessionToken && sessionToken.replace(/^Bearer\s/, '') };
};
