import knex from 'knex';
import knexConfig from '../../knexfile';
import Database from './database';
import Docker from './docker';
import DockerHub from './docker-hub';
import FactorioAuth from './factorio-auth';
import AdminList from './admin-list';
import MapGenerationSettings from './map-generation-settings';

export default function createDataSource() {
	return {
		db: new Database(knex(knexConfig)),
		docker: new Docker(),
		dockerHub: new DockerHub(),
		factorioAuth: new FactorioAuth(),
		adminList: new AdminList(process.env.VOLUME_ROOT),
		mapGenerationSettings: new MapGenerationSettings(process.env.VOLUME_ROOT),
	};
}
