'use strict';

module.exports = {
	testMatch: ['<rootDir>/src/**/__tests__/*.spec.js'],
	testPathIgnorePatterns: ['/node_modules/'],
	transform: {
		'^.+\\.js$': 'babel-jest',
	},
	setupFiles: ['jest-date-mock'],
};
