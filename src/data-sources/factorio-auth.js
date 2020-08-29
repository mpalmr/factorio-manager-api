import { RESTDataSource } from 'apollo-datasource-rest';

export default class FactorioAuth extends RESTDataSource {
	constructor(...args) {
		super(...args);
		this.baseURL = 'https://auth.factorio.com';
	}

	async login({ username, password }) {
		const payload = new URLSearchParams();
		payload.append('username', username);
		payload.append('password', password);

		return this.post('/api-login', payload, {
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		}).then(res => res[0]);
	}
}
