'use strict';

const { DataSource } = require('apollo-datasource');
const { Docker } = require('docker-cli-js');
const { IMAGE_NAME, FACTORIO_TCP_PORT, FACTORIO_UDP_PORT } = require('../constants');

const nameTrimPattern = new RegExp(`^${process.env.CONTAINER_NAMESPACE}_`);

function toName(name) {
	return `${process.env.CONTAINER_NAMESPACE}_${name}`;
}

function fromName(fullName) {
	return fullName.replace(nameTrimPattern, '');
}

module.exports = class DockerDatasource extends DataSource {
	constructor(...args) {
		super(...args);
		this.docker = new Docker({ echo: process.env.DEBUG === 'true' });
	}

	async parseContainer(container) {
		const containerData = await this.inspect(container.names);
		console.log(containerData);
		return {
			name: fromName(container.names),
		};
	}

	async inspect(containerId) {
		const metaData = await this.docker.command(`inspect ${containerId}`)
			.then(containerData => containerData.object[0]);
		console.log(metaData.Config.Labels);
		return {
			internalId: metaData.Config.Labels.internal_id,
		};
	}

	async getContainerById(gameId) {
		const { containerList } = await this.docker.command(`ps -af internal_id=${gameId}`);
		if (!containerList.length) return null;
		if (containerList.length > 1) throw new Error('Found two games with the same ID');
		return this.parseContainer(containerList[0]);
	}

	async list() {
		return this.docker.command(`ps -af name=${process.env.CONTAINER_NAMESPACE}`)
			.then(({ containerList }) => Promise.all(containerList
				.map(container => this.parseContainer(container))));
	}

	async pull(version) {
		return this.docker.command(`pull ${IMAGE_NAME}:${version}`);
	}

	async run(game, containerVolumePath, saveName = 'default') {
		return this.docker
			.command([
				'run',
				'--detatch',
				'--env ENABLE_GENERATE_NEW_MAP_SAVE=true',
				`--env SAVE_NAME=${saveName}`,
				'--restart always',
				`--name ${toName(game.name)}`,
				`--label internal_id=${game.id}`,
				`--volume ${containerVolumePath}:/factorio`,
				game.tcpPort
					? `--publish ${game.tcpPort}:${FACTORIO_TCP_PORT}/tcp`
					: `--expose ${FACTORIO_TCP_PORT}/tcp`,
				game.udpPort
					? `--publish ${game.udpPort}:${FACTORIO_UDP_PORT}/udp`
					: `--expose ${FACTORIO_UDP_PORT}/udp`,
				`${IMAGE_NAME}:${game.version}`,
			]
				.join(' '))
			.then(({ containerId }) => containerId);
	}

	async stop(gameIdOrName) {
		return this.docker.command(`stop ${gameIdOrName}`)
			.then(({ containerId }) => containerId);
	}
};
