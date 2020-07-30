'use strict';

const path = require('path');
const fs = require('fs').promises;
const rmfr = require('rmfr');
const { createError } = require('apollo-errors');
const gql = require('graphql-tag');
const Database = require('../../data-sources/database');
const Docker = require('../../data-sources/docker');
const { authenticationResolver,	DuplicateError, baseResolver } = require('../resolvers');

exports.typeDefs = gql`
	extend type Query {
		games: [Game!]!
		availableVersions: [String!]! @cacheControl(maxAge: 3600)
	}

	extend type Mutation {
		createGame(game: CreateGameInput!): Game!
		deleteGame(gameId: ID!): Boolean
		startGame(gameId: ID!): Game!
		stopGame(gameId: ID!): Game!
	}

	input CreateGameInput {
		name: String! @constraint(minLength: 3, maxLength: 40)
		version: String
	}

	type Game {
		id: ID!
		name: String! @constraint(minLength: 3, maxLength: 40)
		isOnline: Boolean!
		creator: User! @cacheControl(maxAge: 86400)
		version: String!
		createdAt: DateTime!
	}
`;

const NotFoundError = createError('NotFoundError', {
	message: 'Resource could not be found',
});

const ForbiddenError = createError('ForbiddenError', {
	message: 'You do not have permissions to view this resource',
});

const isGameOwnerResolver = authenticationResolver.createResolver(
	async (parent, { gameId }, ctx) => {
		const gameRecord = await ctx.dataSources.db.knex('game')
			.where('id', parseInt(gameId, 10))
			.first()
			.then(Database.fromRecord);
		if (!gameRecord) throw new NotFoundError();
		if (gameRecord.creatorId !== ctx.user.id) throw new ForbiddenError();
		ctx.game = await ctx.dataSources.docker.getContainers(gameRecord.name)
			.then(([gameContainer]) => ({ ...gameContainer, ...gameRecord }));
	},
);

function createUpdateStateResolver(action) {
	return isGameOwnerResolver.createResolver(
		async (root, args, { dataSources, game }) => dataSources.docker.cli
			.command(`${action} ${Docker.toContainerName(game.name)}`)
			.then(() => ({ ...game, isOnline: action === 'start' })),
	);
}

exports.resolvers = {
	Query: {
		games: authenticationResolver.createResolver(
			async (root, args, { dataSources }) => dataSources.db.knex('games').orderBy('created_at'),
		),

		availableVersions: baseResolver.createResolver(
			async (root, args, { dataSources }) => dataSources.dockerHub.getAvailableVersions(),
		),
	},

	Mutation: {
		createGame: authenticationResolver.createResolver(
			async (root, { game }, { dataSources, user }) => {
				// Create volume directory
				const containerVolumePath = path.resolve(`${process.env.VOLUME_ROOT}/${game.name}`);
				await fs.mkdir(containerVolumePath)
					.catch(ex => Promise.reject(ex.code === 'EEXIST' ? new DuplicateError() : ex));
				// TODO: Run this process as usear factorio UID 845
				// await fs.chown(containerVolumePath, 845, 845);

				// Create docker container
				const version = game.version || 'latest';
				const containerId = await dataSources.docker.run(game.name, game.version);

				// Stop container and remove temporary save file
				await dataSources.docker.stop(containerId);
				await rmfr(path.join(containerVolumePath, 'saves', '*'));

				// Create database entry
				return dataSources.db.knex.transaction(trx => trx('game').insert(Database.toRecord({
					containerId,
					version,
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

		deleteGame: isGameOwnerResolver.createResolver(
			async (root, { gameId }, { dataSources }) => {
				const { containerId, name } = await dataSources.db.knex('game')
					.where('id', gameId)
					.select('container_id', 'name')
					.first()
					.then(Database.fromRecord);

				await dataSources.docker.cli.command(`rm -f ${containerId}`);
				await rmfr(path.resolve(`${process.env.VOLUME_ROOT}/${name}`));
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
