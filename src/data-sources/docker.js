'use strict';

const { DataSource } = require('apollo-datasource');
const { Docker } = require('docker-cli-js');

const fromContainerStripPattern = new RegExp(`^${process.env.CONTAINER_NAMESPACE}_`);

module.exports = class DockerDataSource extends DataSource {
	static fromContainer(container) {
		return {
			name: DockerDataSource.fromContainerName(container.names),
			containerId: container['container id'],
			version: container.image.replace(/^.+:/, ''),
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
};
