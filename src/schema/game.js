import path from 'path';
import fs from 'fs/promises';
import rmfr from 'rmfr';
import { ApolloError } from 'apollo-server';
import { composeResolvers } from '@graphql-tools/resolvers-composition';
import gql from 'graphql-tag';
import Database from '../data-sources/database';
import { isAuthenticated, resolveGame } from './resolvers';

export const typeDefs = gql`
	extend type Query {
		games: [Game!]!
		game(id: ID!): Game!
	}

	extend type Mutation {
		createGame(game: CreateGameInput!): Game!
		deleteGame(gameId: ID!): Boolean
		updateGame(game: UpdateGameInput!): Game!
	}

	input CreateGameInput {
		name: GameName!
		version: Version
		admins: [String]
		mapGenerationSettings: MapGenerationSettingsInput
	}

	input MapGenerationSettingsInput {
		peacefulMode: Boolean
		seed: UnsignedInt # Leave null for random seed
		biterStartingAreaMultiplier: UnsignedInt
	}

	input UpdateGameInput {
		id: ID!
		name: GameName
	}

	extend type Game {
		id: ID!
		name: GameName!
		creator: User! @cacheControl(maxAge: 86400)
		version: Version!
		port: Port!
		mapGenerationSettings: MapGenerationSettings!
		admins: [String]!
		settings: GameSettings!
		createdAt: DateTime!
	}

	type MapGenerationSettings {
		peacefulMode: Boolean!
		seed: UnsignedInt # Leave null for random seed
		biterStartingAreaMultiplier: UnsignedInt
	}

	type GameSettings {
		recipeDifficulty: UnsignedInt!
		technologyDifficulty: UnsignedInt!
		technologyPriceMultiplier: UnsignedInt!
		researchQueue: ResearchQueueType!
		isPollutionEnabled: Boolean!
		isEnemyEvolutionEnabled: Boolean!
		isEnemyExpansionEnabled: Boolean!
	}

	enum ResearchQueueType {
		AFTER_VICTORY
		ALWAYS
		NEVER
	}
`;

export const resolvers = composeResolvers({
	Query: {
		async games(root, args, { dataSources }) {
			return dataSources.db.knex('game')
				.orderBy('created_at')
				.then(Database.fromRecord);
		},

		async game(root, { id }, { dataSources }) {
			return dataSources.db.knex('game')
				.where('id', id)
				.first()
				.then(record => {
					if (!record) throw new ApolloError('Game not found');
					return Database.fromRecord(record);
				});
		},
	},

	Mutation: {
		async createGame(
			root,
			{
				game: { admins, ...game },
			},
			{ dataSources, user },
		) {
			// Create volume directory
			const containerVolumePath = path.resolve(`${process.env.VOLUME_ROOT}/${game.name}`);
			await fs.mkdir(containerVolumePath).catch(ex => Promise.reject(ex.code === 'EEXIST'
				? new ApolloError('Game already exists')
				: ex));
			// TODO: Run this process as user factorio UID 845
			// await fs.chown(containerVolumePath, 845, 845);

			// Create docker container_id
			async function findAvailablePort() {
				const portsInUse = await dataSources.db.knex('game')
					.select('port')
					.then(games => games.map(a => a.port));
				function generatePort() {
					const port = Math.floor(Math.random() * (65535 - 1024) + 1024);
					return portsInUse.includes(port) ? generatePort() : port;
				}
				return generatePort();
			}
			const factorioPort = game.port || await findAvailablePort();

			const version = game.version || 'latest';
			const containerId = await dataSources.docker.run(game.name, game.version, { factorioPort });

			await dataSources.docker.stop(containerId);
			await Promise.all([
				rmfr(path.join(containerVolumePath, 'saves', '*')),
				dataSources.adminList.write(game.name, admins),
			]);

			// Create database entry
			return dataSources.db.knex.transaction(async trx => {
				await trx('game').insert(Database.toRecord({
					containerId,
					version,
					port: factorioPort,
					name: game.name,
					creatorId: user.id,
				}));
				return trx('game').where('name', game.name).first().then(Database.fromRecord);
			});
		},

		async updateGame(root, { game: updates }, { game, dataSources }) {
			return dataSources.db.knex.transaction(async trx => {
				const tasks = [trx('game').where('id', game.id).update(Database.toRecord(updates))];
				if (updates.admins) tasks.push(dataSources.adminList.write(updates.admins));
				await Promise.all(tasks);
				return trx('game').where('id', game.id).first().then(Database.fromRecord);
			});
		},

		async deleteGame(root, { gameId }, { game, dataSources }) {
			await dataSources.docker.cli.command(`rm -vf ${game.containerId}`);
			await rmfr(path.resolve(`${process.env.VOLUME_ROOT}/${game.name}`));
			await dataSources.db.knex('game').where('id', gameId).del();
			return null;
		},
	},

	Game: {
		async creator(game, args, { dataSources }) {
			return dataSources.db.knex('user')
				.where('id', game.creatorId)
				.select('user.*')
				.first()
				.then(Database.fromRecord);
		},

		async mapGenerationSettings(game, args, { dataSources }) {
			return dataSources.mapGenreationSettings.get(game.name);
		},

		async admins(game, args, { dataSources }) {
			const usernames = await dataSources.adminList.get();
			return dataSources.db.knex('user')
				.whereIn(usernames)
				.then(Database.fromRecord);
		},

		async settings(game, args, { dataSources }) {
			return dataSources.gameSettings.get(game.name);
		},
	},
}, {
	Query: {
		game: [isAuthenticated()],
		games: [isAuthenticated()],
	},
	Mutation: {
		createGame: [isAuthenticated()],
		updateGame: [isAuthenticated(), resolveGame({
			ownsGame: true,
			isOnline: false,
		})],
		deleteGame: [isAuthenticated(), resolveGame({
			ownsGame: true,
			isOnline: false,
		})],
		startGame: [isAuthenticated(), resolveGame({
			ownsGame: true,
			isOnline: false,
		})],
		stopGame: [isAuthenticated(), resolveGame({
			ownsGame: true,
			isOnline: false,
		})],
	},
});
