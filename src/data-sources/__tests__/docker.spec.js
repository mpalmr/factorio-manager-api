import Docker from '../docker';

jest.mock('docker-cli-js', () => ({
	Docker: class MockDocker {
		constructor() {
			this.cli = jest.fn();
		}
	},
}));

jest.mock('../../constants', () => ({ IMAGE_NAME: 'mockImageName' }));

const originalEnv = { ...process.env };
afterEach(() => {
	process.env = { ...originalEnv };
});

test('toContainerName', () => {
	process.env.CONTAINER_NAMESPACE = 'swag';
	expect(Docker.toContainerName('master')).toBe('swag_master');
});
