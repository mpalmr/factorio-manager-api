'use strict';

module.exports = {
	testEnvironment: 'node',
	testMatch: ['<rootDir>/tests/**/*.spec.js'],
	setupFiles: ['jest-date-mock'],
	setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
};
