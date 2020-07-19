'use strict';

const { DataSource } = require('apollo-datasource');
const { Docker } = require('docker-cli-js');
const { IMAGE_NAME, DOCKERFILE_PATH } = require('../constants');

function parseContainer(container) {
	console.log(container);
	return container;
}

module.exports = class DockerDatasource extends DataSource {
	constructor(...args) {
		super(...args);
		this.docker = new Docker({ echo: process.env.DEBUG === 'true' });
	}

	async getContainerById(gameId) {
		const { containerList } = await this.docker.command(`ps -af internal_id=${gameId}`);
		if (!containerList.length) return null;
		if (containerList.length > 1) throw new Error('Found two games with the same ID');
		return parseContainer(containerList[0]);
	}

	async list() {
		return this.docker.command(`ps -af label=${process.env.CONTAINER_NAMESPACE}`)
			.then(({ containerList }) => containerList.map(parseContainer));
	}

	async pull(version) {
		return this.docker.command(`pull ${IMAGE_NAME}:${version}`);
	}

	async run(game, containerVolumePath) {
		return this.docker.command([
			'run',
			'--detach',
			'--env ENABLE_GENERATE_NEW_MAP_SAVE=true',
			'--env SAVE_NAME=dummy',
			'--restart always',
			`--name ${process.env.CONTAINER_NAMESPACE}_${game.name}`,
			`--volume ${containerVolumePath}:/factorio`,
			`--publish ${game.tcpPort}:27015/tcp`,
			`--publish ${game.udpPort}:34197/udp`,
			`factoriotools/factorio:${game.version}`,
		]
			.join(' '));
	}
};
