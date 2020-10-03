import path from 'path';
import fs from 'fs/promises';
import { DataSource } from 'apollo-datasource';
import camelcaseKeys from 'camelcase-keys';
import snakecaseKeys from 'snakecase-keys';

export default class MapGenerationSettings extends DataSource {
	constructor(volumeRoot) {
		super();
		this.volumeRoot = volumeRoot;
	}

	getJsonPath(gameName) {
		return path.join(this.volumeRoot, gameName, 'config', 'map-gen-settings.json');
	}

	async get(gameName) {
		return fs.readFile(this.getJsonPath(gameName), 'utf-8')
			.then(JSON.parse)
			.then(camelcaseKeys)
			.then(settings => ({
				peacefulMode: settings.peacefulMode,
				seed: settings.seed,
				biterStartingAreaMultiplier: settings.startingArea,
			}));
	}

	async write(gameName, { biterStartingAreaMultiplier, ...settings }) {
		const contents = JSON.stringify(snakecaseKeys({
			...settings,
			startingArea: biterStartingAreaMultiplier,
		}), null, 2);
		return fs.writeFile(this.getJsonPath(gameName), 'utf-8', contents);
	}

	async apply(gameName, settings) {
		const existingConfig = await this.get(gameName);
		return this.write({
			...existingConfig,
			...settings,
		});
	}
}
