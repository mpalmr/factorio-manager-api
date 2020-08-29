import path from 'path';
import fs from 'fs/promises';
import rmfr from 'rmfr';
import { GraphQLScalarType, GraphQLError } from 'graphql';
import { Kind } from 'graphql/language';
import { ApolloError, ForbiddenError } from 'apollo-server';
import { composeResolvers } from '@graphql-tools/resolvers-composition';
import gql from 'graphql-tag';
import Database from '../data-sources/database';
import Docker from '../data-sources/docker';
import { isAuthenticated } from './resolvers';

// TODO: Try out ValidationError within apollo-server
function validateGameName(value) {
	const trimmedValue = value.trim();
	if (!/^[a-z\d\s_-]+$/i.test(trimmedValue)) {
		throw new GraphQLError(
			'Game name can only contain letters, numbers, spaces, underscores, and dashes',
		);
	}
	return trimmedValue;
}

const GameNameResolver = new GraphQLScalarType({
	name: 'GameName',
	description: 'Name of the game for users to identify their specific factories',
	parseValue: validateGameName,
	serialize: validateGameName,
	parseLiteral(ast) {
		if (ast.kind === Kind.STRING) return validateGameName(ast.value);
		throw new GraphQLError('Invalid game name');
	},
});

export const typeDefs = gql`
	scalar GameName

	extend type Query {
		games: [Game!]!
		game(id: ID!): Game!
	}

	extend type Mutation {
		createGame(game: CreateGameInput!): Game!
		deleteGame(gameId: ID!): Boolean
		updateGame(game: UpdateGameInput!): Game!
		startGame(gameId: ID!): Game!
		stopGame(gameId: ID!): Game!
	}

	input CreateGameInput {
		name: GameName!
		version: Version
	}

	input UpdateGameInput {
		id: ID!
		name: GameName
	}

	type Game {
		id: ID!
		name: GameName!isOnline: Boolean!
		creator: User! @cacheControl(maxAge: 86400)
		version: Version!
		port: Port!
		createdAt: DateTime!
	}
`;

function resolveGame({ ownsGame = false, isOnline = null } = {}) {
	return next => async (parent, args, ctx, info) => {
		const game = await ctx.dataSources.db.knex('game')
			.where('id', args.gameId || args.game?.id)
			.first()
			.then(Database.fromRecord);

		if (!game) throw new ApolloError('Game not found');
		if (ownsGame && game.creatorId !== ctx.user.id) {
			throw new ForbiddenError('You do not have permissions to view this resource');
		}
		if (isOnline === true && !game.isOnline) {
			throw new ApolloError('Game must be online to perform this action');
		}
		if (isOnline === false && game.isOnline) {
			throw new ApolloError('Game must be offline to perform this action');
		}

		return next(parent, args, { ...ctx, game }, info);
	};
}

function createUpdateStateResolver(action) {
	return async (root, args, { dataSources, game }) => dataSources.docker.cli
		.command(`${action} ${Docker.toContainerName(game.name)}`)
		.then(() => ({ ...game, isOnline: action === 'start' }));
}

export const resolvers = composeResolvers({
	GameName: GameNameResolver,

	Query: {
		async games(root, args, { dataSources }) {
			return dataSources.db.knex('game')
				.orderBy('created_at')
				.then(games => games.map(Database.fromRecord));
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
		async createGame(root, { game }, { dataSources, user }) {
			// Create volume directory
			const containerVolumePath = path.resolve(`${process.env.VOLUME_ROOT}/${game.name}`);
			await fs.mkdir(containerVolumePath)
				.catch(ex => Promise.reject(ex.code === 'EEXIST'
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

			// Stop container and remove temporary save file
			await dataSources.docker.stop(containerId);
			await rmfr(path.join(containerVolumePath, 'saves', '*'));

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
			await dataSources.db.knex.knex('game')
				.where('id', game.id)
				.update(updates);
			return { ...game, ...updates };
		},

		async deleteGame(root, { gameId }, { game, dataSources }) {
			await dataSources.docker.cli.command(`rm -f ${game.containerId}`);
			await rmfr(path.resolve(`${process.env.VOLUME_ROOT}/${game.name}`));
			await dataSources.db.knex('game').where('id', gameId).del();
			return null;
		},

		startGame: createUpdateStateResolver('start'),
		stopGame: createUpdateStateResolver('stop'),
	},

	Game: {
		async isOnline(game, args, { dataSources }) {
			return dataSources.docker.isOnline(game.containerId);
		},

		async creator(game, args, { dataSources }) {
			return dataSources.db.knex('user')
				.where('id', game.creatorId)
				.select('user.*')
				.first()
				.then(Database.fromRecord);
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
