import path from 'path';
import fs from 'fs/promises';
import rmfr from 'rmfr';
import { createError } from 'apollo-errors';
import gql from 'graphql-tag';
import Database from '../../data-sources/database';
import Docker from '../../data-sources/docker';
import { authenticationResolver,	DuplicateError } from '../resolvers';

export const typeDefs = gql`
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
		name: String! @constraint(minLength: 3, maxLength: 40)
		version: String
	}

	input UpdateGameInput {
		id: ID!
		name: String @constraint(minLength: 3, maxLength: 40)
	}

	type Game {
		id: ID!
		name: String! @constraint(minLength: 3, maxLength: 40)
		isOnline: Boolean!
		creator: User! @cacheControl(maxAge: 86400)
		version: String!
		port: Int! @constraint(min: 1024, max: 65535)
		createdAt: DateTime!
	}
`;

const NotFoundError = createError('NotFoundError', {
	message: 'Resource could not be found',
});

const ForbiddenError = createError('ForbiddenError', {
	message: 'You do not have permissions to view this resource',
});

const IsRunningError = createError('IsRunningError', {
	message: 'Container must be stopped to perform this operation',
});

const getGameByIdResolver = authenticationResolver.createResolver((parent, args, ctx) => {
	ctx.getGameById = async id => ctx.dataSources.db.knex('game')
		.where('id', parseInt(id, 10))
		.first()
		.then(record => {
			if (!record) throw new NotFoundError();
			return Database.fromRecord(record);
		});
});

const isOwnGameOffline = getGameByIdResolver.createResolver(
	async (parent, { gameId, game }, ctx) => {
		ctx.game = await ctx.getGameById(gameId || game?.id).then(result => {
			if (result.creatorId !== ctx.user.id) throw new ForbiddenError();
			if (result.isOnline) throw new IsRunningError();
			return result;
		});
	},
);

function createUpdateStateResolver(action) {
	return isOwnGameOffline.createResolver(
		async (root, args, { dataSources, game }) => dataSources.docker.cli
			.command(`${action} ${Docker.toContainerName(game.name)}`)
			.then(() => ({ ...game, isOnline: action === 'start' })),
	);
}

export const resolvers = {
	Query: {
		games: authenticationResolver.createResolver(
			async (root, args, { dataSources }) => dataSources.db.knex('game')
				.orderBy('created_at')
				.then(games => games.map(Database.fromRecord)),
		),

		game: authenticationResolver.createResolver(
			async (root, { id }, { dataSources }) => dataSources.db.knex('game')
				.where('id', id)
				.first()
				.then(record => {
					if (!record) throw new NotFoundError();
					return Database.fromRecord(record);
				}),
		),
	},

	Mutation: {
		createGame: authenticationResolver.createResolver(
			async (root, { game }, { dataSources, user }) => {
				// Create volume directory
				const containerVolumePath = path.resolve(`${process.env.VOLUME_ROOT}/${game.name}`);
				await fs.mkdir(containerVolumePath)
					.catch(ex => Promise.reject(ex.code === 'EEXIST' ? new DuplicateError() : ex));
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
				return dataSources.db.knex.transaction(trx => trx('game').insert(Database.toRecord({
					containerId,
					version,
					port: factorioPort,
					name: game.name,
					creatorId: user.id,
				}))
					.then(() => trx('game').where('name', game.name).first())
					.then(Database.fromRecord));
			},
			async (root, { game }, { dataSources }, error) => {
				// Remove container and its volume if any errors occur
				await Promise.all([
					dataSources.docker.remove(game.name, true)
						.catch(ex => (ex.message.includes('No such container') ? null : Promise.reject(ex))),
					rmfr(path.resolve(`${process.env.VOLUME_ROOT}/${game.name}`)),
				]);
				return Promise.reject(error);
			},
		),

		updateGame: isOwnGameOffline.createResolver(
			async (root, { game: updates }, { game, dataSources }) => {
				if (game.isOnline) throw new IsRunningError();
				await dataSources.db.knex.knex('game')
					.where('id', game.id)
					.update(updates);
				return { ...game, ...updates };
			},
		),

		deleteGame: isOwnGameOffline.createResolver(
			async (root, { gameId }, { game, dataSources }) => {
				if (game.isOnline) throw new IsRunningError();
				await dataSources.docker.cli.command(`rm -f ${game.containerId}`);
				await rmfr(path.resolve(`${process.env.VOLUME_ROOT}/${game.name}`));
				await dataSources.db.knex('game').where('id', gameId).del();
				return null;
			},
		),

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
};
