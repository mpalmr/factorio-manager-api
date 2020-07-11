'use strict';

const DockerDataSource = require('../docker');

jest.mock('docker-cli-js', () => ({
	Docker: class MockDocker {
		command = jest.fn();
	},
}));

jest.mock('../../constants', () => ({
	IMAGE_NAME: 'mockImageName',
	DOCKERFILE_PATH: 'mockDockerfilePath',
}));

test('Does not call any commands on construction', async () => {
	const source = new DockerDataSource();
	expect(source.docker.command).not.toHaveBeenCalled();
});

describe('#build', () => {
	let pull;
	beforeAll(() => {
		pull = jest.spyOn(DockerDataSource.prototype, 'pull');
	});

	beforeEach(() => {
		pull.mockReset();
	});

	afterAll(() => {
		pull.mockRestore();
	});

	test('Calls #pull if version is set to latest', async () => {
		const source = new DockerDataSource();
		source.docker.command.mockImplementation(async command => {
			if (command.startsWith('pull')) return 'mockPullResult';
			if (command.startsWith('build')) return 'mockBuildResult';
			throw new Error('Unexpected command');
		});
		await expect(source.build('mockGameId', '/cool/stuff', 'latest')).resolves
			.toBe('mockBuildResult');
		expect(pull).toHaveBeenCalled();
		expect(source.docker.command).toHaveBeenCalled();
	});
});
