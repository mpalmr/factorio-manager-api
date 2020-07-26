'use strict';

const { DataSource } = require('apollo-datasource');
const { Docker } = require('docker-cli-js');

module.exports = class DockerDatasource extends DataSource {
	static toContainerName(name) {
		return `${process.env.CONTAINER_NAMESPACE}_${name}`;
	}

	constructor(...args) {
		super(...args);
		this.cli = new Docker({ echo: process.env.DEBUG === 'true' });
	}
};
