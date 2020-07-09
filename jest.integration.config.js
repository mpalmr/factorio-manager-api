'use strict';

module.exports = {
	testEnvironment: 'node',
	testMatch: ['<rootDir>/tests/**/*.spec.js'],
	setupFiles: ['<rootDir>/jest.integration.setup.js'],
	setupFilesAfterEnv: ['<rootDir>/tests/hooks.js'],
};
