'use strict';

module.exports = {
	testMatch: ['<rootDir>/src/**/__tests__/*.spec.js'],
	testPathIgnorePatterns: ['/node_modules/'],
	setupFilesAfterEnv: '<rootDir>/jest.setup.js',
};
