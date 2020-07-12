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

describe('#getImageVersion', () => {
	const originalEnv = { ...process.env };

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	test('Retreives the image tag containing the version', async () => {
		process.env.CONTAINER_NAMESPACE = 'mockContainerNamespace';
		const source = new DockerDataSource();
		source.docker.command.mockResolvedValue('factoriotools/factorio:latest');
		await expect(source.getImageVersion('ayyo')).resolves.toBe('latest');

		const nameFilterArg = source.docker.command.mock.calls[0][0].split(/\s+/g)[2];
		expect(nameFilterArg).toBe('name=mockContainerNamespace_ayyo');
	});
});

describe('#build', () => {
	let originalEnv;
	let pull;

	beforeAll(() => {
		originalEnv = { ...process.env };
		pull = jest.spyOn(DockerDataSource.prototype, 'pull');
	});

	beforeEach(() => {
		pull.mockReset();
	});

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	afterAll(() => {
		pull.mockRestore();
	});

	async function mockCommand(command) {
		if (command.startsWith('pull')) return 'mockPullResult';
		if (command.startsWith('build')) return 'mockBuildResult';
		throw new Error('Unexpected command');
	}

	test('Calls #pull if version is set to latest', async () => {
		const source = new DockerDataSource();
		source.docker.command.mockImplementation(mockCommand);
		await expect(source.build('mockGameId', '/cool/stuff', { version: 'latest' })).resolves
			.toBe('mockBuildResult');
		expect(pull).toHaveBeenCalled();
		expect(source.docker.command).toHaveBeenCalled();
	});

	test('Does not call #pull if version is set to something else', async () => {
		const source = new DockerDataSource();
		source.docker.command.mockImplementation(mockCommand);
		await expect(source.build('mockGameId', '/cool/stuff', { version: '8.2.3' })).resolves
			.toBe('mockBuildResult');
		expect(pull).not.toHaveBeenCalled();
		expect(source.docker.command).toHaveBeenCalled();
	});

	test('Provides correct build arguments', async () => {
		process.env.CONTAINER_NAMESPACE = 'mockContainerNamespace';
		const source = new DockerDataSource();
		await source.build('mockGameId', '/cool/stuff', {
			version: '8.2.3',
			tcpPort: 8922,
			udpPort: 3234,
		});
		const [
			commandArg, // eslint-disable-line no-unused-vars
			labelKeyArg,
			imageTagArg,
			internalIdArg,
			tcpPortArg,
			udpPortArg,
		] = source.docker.command.mock.calls[0][0]
			.split(/\s{2,}/g)
			.map(a => a.trim());

		expect(labelKeyArg).toBe('--build-arg label_key=mockContainerNamespace');
		expect(imageTagArg).toBe('--build-arg image_tag=8.2.3');
		expect(internalIdArg).toBe('--build-arg internal_id=mockGameId');
		expect(tcpPortArg).toBe('--build-arg tcp_port=8922');
		expect(udpPortArg).toBe('--build-arg udp_port=3234');
	});
});
