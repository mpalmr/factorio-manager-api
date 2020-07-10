'use strict';

const { DataSource } = require('apollo-datasource');
const { Docker } = require('docker-cli-js');
const { DOCKERFILE_PATH } = require('../constants');

module.exports = class DockerDatasource extends DataSource {
	constructor(...args) {
		super(...args);
		this.docker = new Docker({ echo: process.env.DEBUG === 'true' });
	}

	async list() {
		return this.docker.command('ps -af label=factorio_manager_api')
			.then(({ containerList }) => containerList);
	}

	async build(id, containerPath) {
		return this.docker.command(`
			build
				--build-arg INTERNAL_ID=${id}
				--build-arg CONTAINER_PATH=${containerPath}
				--build-arg IMAGE_TAG=latest
				--build-arg TCP_PORT=27015
				--build-arg UDP_PORT=34197
				-f ${DOCKERFILE_PATH} ${containerPath}
		`);
	}
};
