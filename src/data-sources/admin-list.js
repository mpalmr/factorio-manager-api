import path from 'path';
import fs from 'fs/promises';
import { ApolloError } from 'apollo-server';
import { DataSource } from 'apollo-datasource';

export default class AdminList extends DataSource {
	constructor(volumeRoot) {
		super();
		this.volumeRoot = volumeRoot;
	}

	getJsonPath(gameName) {
		return path.join(this.volumeRoot, gameName, 'config', 'server-adminlist.json');
	}

	async get(gameName) {
		return fs.readFile(this.getJsonPath(gameName), 'utf-8').then(JSON.parse);
	}

	async write(gameName, admins) {
		return fs.writeFile(this.getJsonPath(gameName), 'utf-8', JSON.stringify(admins, null, 2));
	}

	async add(gameName, username) {
		const admins = await this.get(gameName);
		if (admins.includes(username)) throw new ApolloError('User is already an admin');
		const updatedAdmins = admins.concat(username);
		await this.write(gameName, updatedAdmins);
		return updatedAdmins;
	}

	async remove(gameName, username) {
		const admins = await this.get(gameName);
		if (!admins.includes(username)) throw new ApolloError('Not found');
		const updatedAdmins = admins.filter(admin => admin !== username);
		await this.write(gameName, updatedAdmins);
		return updatedAdmins;
	}
}
