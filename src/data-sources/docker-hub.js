'use strict';

const { RESTDataSource } = require('apollo-datasource-rest');

// const semverPattern = /^(\d+\.){2}\d+$/;

module.exports = class DockerHubDataSource extends RESTDataSource {
	constructor(...args) {
		super(...args);
		this.baseURL = 'https://registry.hub.docker.com/';
	}

	async getAvailableVersions() {
		return this.get('/v1/repositories/factoriotools/factorio/tags')
			.then(versions => versions.map(version => version.name));
	}

	// async getAvailableVersions() {
	// 	return this.get('/v1/repositories/factoriotools/factorio/tags')
	// 		.then(versions => versions
	// 			.map(version => version.name)
	// 			.filter(version => !version.endsWith('-dev') && !/^\d+\.\d+(-dev)?$/.test(version))
	// 			.sort((a, b) => {
	// 				// Put non-semver tags on top
	// 				const isASemver = semverPattern.test(a);
	// 				const isBSemver = semverPattern.test(b);
	// 				if (!isASemver && !isBSemver) return a.localeCompare(b);
	// 				if (!isASemver) return -1;
	// 				if (!isBSemver) return 1;

	// 				// Sort semver
	// 				return [a, b]
	// 					.map(version => version
	// 						.split('.')
	// 						.flatMap(x => x.split('-'))
	// 						.map(x => parseInt(x, 10)))
	// 					.map(version => (version.length === 2 ? [0, ...version] : version))
	// 					.find(([aValue, bValue]) => bValue - aValue);
	// 			}));
	// }
};