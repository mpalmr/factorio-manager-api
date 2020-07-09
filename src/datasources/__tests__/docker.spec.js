'use strict';

const DockerDatasource = require('../docker');

jest.mock('docker-cli-js', () => ({
	Docker: class MockDocker {
		constructor() {
			this.command = jest.fn();
		}
	},
}));
jest.mock('../../constants', () => ({ IMAGE_NAME: 'mockImageName' }));

describe('#list', () => {
	test('Filters out all images not of IMAGE_NAME', async () => {
		const datasource = new DockerDatasource();
		datasource.docker.command.mockResolvedValue([
			{ id: 'a', image: 'mockImageName' },
			{ id: 'b', image: 'notMockImageName' },
			{ id: 'c', image: 'mockImageName' },
		]);
		return expect(datasource.list()).resolves.toEqual([
			{ id: 'a', image: 'mockImageName' },
			{ id: 'c', image: 'mockImageName' },
		]);
	});
});
