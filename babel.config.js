'use strict';

module.exports = function babelConfig(api) {
	api.cache(true);
	return {
		plugins: ['@babel/plugin-proposal-optional-chaining'],
	};
};
