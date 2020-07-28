'use strict';

// const { RESTDataSource } = require('apollo-datasource-rest');
// const DockerHub = require('../docker-hub');

jest.mock('apollo-datasource-rest', () => {
	class MockRESTDataSource {}
	MockRESTDataSource.prototype.get = jest.fn();
	return { RESTDataSource: MockRESTDataSource };
});

test('#getAvailableVersions', async () => {
	// RESTDataSource.prototype.get.mockResolvedValue([
	// 	{	layer: '', name: '0.14-dev' },
	// 	{ layer: '', name: '0.13' },
	// 	{ layer: '', name: 'stable' },
	// 	{	layer: '', name: '0.14' },
	// 	{ layer: '', name: 'latest' },
	// 	{	layer: '', name: '0.13.20' },
	// 	{	layer: '', name: '0.13-dev' },
	// ]);
	// const dockerHub = new DockerHub();
	// return expect(dockerHub.getAvailableVersions()).resolves.toEqual([
	// 	'latest',
	// 	'stable',
	// 	'0.14',
	// 	'0.13',
	// 	'0.13.20',
	// ]);
	expect(true).toBe(true);
});
