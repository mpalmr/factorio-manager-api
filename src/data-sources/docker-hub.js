import { RESTDataSource } from 'apollo-datasource-rest';
import semverSort from 'semver/functions/rsort';

export default class DockerHubDataSource extends RESTDataSource {
	constructor(...args) {
		super(...args);
		this.baseURL = 'https://registry.hub.docker.com/';
	}

	async getVersions() {
		return this.get('/v1/repositories/factoriotools/factorio/tags')
			.then(versions => versions
				.map(version => version.name)
				.filter(version => /^(\d+\.){2}\d+$/.test(version)))
			.then(semverSort);
	}
}
