'use strict';

module.exports = {
	testEnvironment: 'node',
	testMatch: ['<rootDir>/tests/**/*.spec.js'],
	setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
	transform: {},
};
