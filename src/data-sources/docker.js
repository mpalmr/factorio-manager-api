'use strict';

const { DataSource } = require('apollo-datasource');
const { Docker } = require('docker-cli-js');
const { IMAGE_NAME } = require('../constants');

module.exports = class DockerDatasource extends DataSource {
	static toContainerName(name) {
		return `${process.env.CONTAINER_NAMESPACE}_${name}`;
	}

	constructor(...args) {
		super(...args);
		this.cli = new Docker({ echo: process.env.DEBUG === 'true' });
	}

	async list() {
		return this.cli
			.command('ps -a')
			.then(containers => containers.filter(container => container.image === IMAGE_NAME));
	}
};
