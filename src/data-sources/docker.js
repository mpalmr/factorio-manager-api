import { DataSource } from 'apollo-datasource';
import { Docker } from 'docker-cli-js';
import { FACTORIO_IMAGE_NAME, FACTORIO_PORT } from '../constants';

const fromContainerStripPattern = new RegExp(`^${process.env.CONTAINER_NAMESPACE}_`);

export default class DockerDataSource extends DataSource {
	static fromContainer(container) {
		return {
			name: DockerDataSource.fromContainerName(container.names),
			containerId: container['container id'],
			version: container.image.replace(/^.+:/, ''),
			isOnline: container.status.startsWith('Up '),
		};
	}

	static fromContainerName(name) {
		return name.replace(fromContainerStripPattern, '');
	}

	static toContainerName(name) {
		return `${process.env.CONTAINER_NAMESPACE}_${name}`;
	}

	constructor(...args) {
		super(...args);
		this.cli = new Docker({ echo: process.env.DEBUG === 'true' });
	}

	async run(
		name,
		volumePath,
		{
			factorioPort,
			version = 'latest',
			updateMods = false,
		} = {},
	) {
		return this.cli.command([
			'run',
			'--detach',
			'--restart always',
			`--name ${DockerDataSource.toContainerName(name)}`,
			`--volume ${volumePath}`,
			`-p ${factorioPort}:${FACTORIO_PORT}/udp`,
			`--env UPDATE_MODS_ON_START=${updateMods}`,
			`${FACTORIO_IMAGE_NAME}:${version}`,
		]
			.filter(Boolean)
			.join(' '))
			.then(({ containerId }) => containerId);
	}

	async isOnline(containerId) {
		return this.cli.command(`inspect ${containerId}`)
			.then(result => result.object[0].State.Status === 'running');
	}

	async start(conatinerId) {
		return this.cli.command(`start ${conatinerId}`);
	}

	async stop(conatinerId) {
		return this.cli.command(`stop ${conatinerId}`);
	}

	async remove(id, isName = false) {
		return this.cli.command(`rm -f ${isName ? DockerDataSource.toContainerName(id) : id}`);
	}

	async getContainers(name, isId = false) {
		const prefix = isId ? '' : `${process.env.CONTAINER_NAMESPACE}_`;
		const { containerList } = await this.cli.command(`ps -af name=${prefix}${name}`);
		return containerList.map(DockerDataSource.fromContainer);
	}
}
