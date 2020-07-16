'use strict';

module.exports = async function context({ req, dataSources }) {
	const sessionToken = req.get('Authorization');
	return !sessionToken ? {} : {
		user: await dataSources.db.getSessionUser(sessionToken.replace(/^Bearer\s/, '')),
	};
};
