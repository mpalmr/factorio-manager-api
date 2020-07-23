'use strict';

const { DataSource } = require('apollo-datasource');
const { Docker } = require('docker-cli-js');
const { IMAGE_NAME } = require('../constants');

module.exports = class DockerDatasource extends DataSource {
	constructor(...args) {
		super(...args);
		this.docker = new Docker({ echo: process.env.NODE_ENV !== 'production' });
	}

	async list() {
		return this.docker
			.command('ps -a')
			.then(containers => containers.filter(container => container.image === IMAGE_NAME));
	}
};
