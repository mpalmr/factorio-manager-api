'use strict';

module.exports = async function context({ req }) {
	const authToken = req.get('Authorization');
	return !authToken ? {} : { authToken: authToken.replace(/^Bearer\s/, '') };
};
