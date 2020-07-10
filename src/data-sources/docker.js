'use strict';

const { DataSource } = require('apollo-datasource');
const { Docker } = require('docker-cli-js');
const { IMAGE_NAME, DOCKERFILE_PATH } = require('../constants');

module.exports = class DockerDatasource extends DataSource {
	constructor(...args) {
		super(...args);
		this.docker = new Docker({ echo: process.env.DEBUG === 'true' });
	}

	async list() {
		return this.docker.command('ps -af label=factorio_manager_api')
			.then(({ containerList }) => containerList);
	}

	async pull() {
		return this.docker.command(`pull ${IMAGE_NAME}`);
	}

	async build(id, containerPath, imageTag = 'latest') {
		if (imageTag === 'latest') await this.pull();
		return this.docker.command(`build \
			--build-arg image_tag=${imageTag} \
			--build-arg internal_id=${id} \
			--build-arg tcp_port=27015 \
			--build-arg udp_pot=34197 \
			-f ${DOCKERFILE_PATH} ${containerPath}
		`);
	}
};
