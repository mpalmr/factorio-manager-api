'use strict';

module.exports = {
	testEnvironment: 'node',
	testMatch: ['<rootDir>/tests/**/*.spec.js'],
	transform: { '\\.jsx?$': ['babel-jest', { rootMode: 'upward' }] },
	setupFiles: ['jest-date-mock', '<rootDir>/tests/env.js'],
	setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
};
