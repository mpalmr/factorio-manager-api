import knex from 'knex';
import knexConfig from '../../knexfile';
import Database from './database';
import Docker from './docker';
import DockerHub from './docker-hub';
import FactorioAuth from './factorio-auth';

export default function createDataSource() {
	return {
		db: new Database(knex(knexConfig)),
		docker: new Docker(),
		dockerHub: new DockerHub(),
		factorioAuth: new FactorioAuth(),
	};
}
