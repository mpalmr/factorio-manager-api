'use strict';

module.exports = {
	root: true,
	extends: 'airbnb-base',
	parser: 'babel-eslint',
	parserOptions: { sourceType: 'script' },
	env: { node: true },
	rules: {
		strict: [2, 'global'],
		indent: [2, 'tab'],
		'no-tabs': 0,
		'arrow-parens': [2, 'as-needed'],
		'no-console': 0,
		'func-names': 0,
		'consistent-return': 0,
	},
	overrides: [
		{
			files: [
				'**/__tests__/*.js',
				'**/__mocks__/*.js',
				'tests/**/*.spec.js',
				'tests/util.js',
				'jest.integration.setup.js',
				'jest.setup.js',
			],
			env: { jest: true },
			plugins: ['jest'],
			globals: { mockDb: true },
			rules: {
				camelcase: 0,
				'import/no-extraneous-dependencies': [2, {
					devDependencies: true,
				}],
			},
		},
	],
};
