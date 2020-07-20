'use strict';

const DockerDataSource = require('../docker');

jest.mock('docker-cli-js', () => ({
	Docker: class MockDocker {
		command = jest.fn();
	},
}));

jest.mock('../../constants', () => ({
	IMAGE_NAME: 'mockImageName',
	FACTORIO_TCP_PORT: 27015,
	FACTORIO_UDP_PORT: 34197,
}));

const originalEnv = { ...process.env };
afterEach(() => {
	process.env = { ...originalEnv };
});

test('Does not call any commands on construction', async () => {
	const source = new DockerDataSource();
	expect(source.docker.command).not.toHaveBeenCalled();
});

describe('#getContainerById', () => {
	test('Passes ID to filter in command', async () => {
		const source = new DockerDataSource();
		source.docker.command.mockResolvedValue({ containerList: ['ay'] });
		await source.getContainerById('im the best container');
		const command = source.docker.command.mock.calls[0][0].split('=')[1];
		expect(command).toBe('im the best container');
	});

	test('Returns null if container cannot be found', async () => {
		const source = new DockerDataSource();
		source.docker.command.mockResolvedValue({ containerList: [] });
		return expect(source.getContainerById('ayyo')).resolves.toBeNull();
	});

	test('Throws an error if more than one container is found', async () => {
		const source = new DockerDataSource();
		source.docker.command.mockResolvedValue({ containerList: ['a', 'b'] });
		return expect(() => source.getContainerById('howdiedo')).rejects
			.toThrow('Found two games with the same ID');
	});

	test('Returns a found container', async () => {
		const source = new DockerDataSource();
		source.docker.command.mockResolvedValue({
			containerList: [{ id: 'mockContainerId' }],
		});
		return expect(source.getContainerById()).resolves.toEqual({ id: 'mockContainerId' });
	});
});

describe('#list', () => {
	test('Passes container namespace into command', async () => {
		process.env.CONTAINER_NAMESPACE = 'mockContainerNamespace';
		const source = new DockerDataSource();
		source.docker.command.mockResolvedValue({ containerList: [] });
		await source.list();
		const command = source.docker.command.mock.calls[0][0].split('=')[1];
		expect(command).toBe('mockContainerNamespace');
	});

	test('Returns an empty array if no containers are returned', async () => {
		const source = new DockerDataSource();
		source.docker.command.mockResolvedValue({ containerList: [] });
		return expect(source.list()).resolves.toEqual([]);
	});

	test('Returns containers', async () => {
		const source = new DockerDataSource();
		source.docker.command.mockResolvedValue({
			containerList: [{ id: 'a' }, { id: 'b' }],
		});
		return expect(source.list()).resolves.toEqual([{ id: 'a' }, { id: 'b' }]);
	});
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
		const [command] = source.docker.command.mock.calls[0];
		expect(command).toContain('label_key=mockContainerNamespace');
		expect(command).toContain('image_tag=8.2.3');
		expect(command).toContain('internal_id=mockGameId');
		expect(command).toContain('tcp_port=8922');
		expect(command).toContain('udp_port=3234');
	});
});
