'use strict';

module.exports = function babelConfig(api) {
	api.cache(process.env.NODE_ENV !== 'production');

	return {
		presets: [
			['@babel/preset-env', {
				targets: { node: 'current' },
			}],
		],
		plugins: [
			'@babel/plugin-proposal-optional-chaining',
			'graphql-tag',
		],
		ignore: process.env.NODE_ENV === 'test' ? [] : ['**/__tests__/**'],
	};
};
