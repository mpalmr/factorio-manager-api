'use strict';

const { DataSource } = require('apollo-datasource');
const { Docker } = require('docker-cli-js');
const { IMAGE_NAME, DOCKERFILE_PATH } = require('../constants');

function toContainerName(name) {
	return `${process.env.CONTAINER_NAMESPACE}_${name}`;
}

module.exports = class DockerDatasource extends DataSource {
	constructor(...args) {
		super(...args);
		this.docker = new Docker({ echo: process.env.DEBUG === 'true' });
	}

	async getImageVersion(name) {
		return this.docker.command(`ps \
				-af name=${toContainerName(name)} \
				--format='{{.Image}}'`)
			.then(image => image.replace(/^.+:/, ''));
	}

	async list() {
		return this.docker.command(`ps -af label=${process.env.CONTAINER_NAMESPACE}`)
			.then(({ containerList }) => containerList);
	}

	async pull() {
		return this.docker.command(`pull ${IMAGE_NAME}`);
	}

	async build(id, containerPath, {
		version = 'latest',
		tcpPort = '27015',
		udpPort = '34197',
	} = {}) {
		if (version === 'latest') await this.pull();
		return this.docker.command(`build \
			--build-arg label_key=${process.env.CONTAINER_NAMESPACE}
			--build-arg image_tag=${version} \
			--build-arg internal_id=${id} \
			--build-arg tcp_port=${tcpPort} \
			--build-arg udp_port=${udpPort} \
			-f ${DOCKERFILE_PATH} ${containerPath}
		`);
	}
};
