'use strict';

const path = require('path');
const fs = require('fs').promises;
const rmfr = require('rmfr');
const gql = require('graphql-tag');
const Database = require('../../data-sources/database');
const Docker = require('../../data-sources/docker');
const {
	authenticationResolver,
	isGameOwnerResolver,
	DuplicateError,
	baseResolver,
} = require('../resolvers');
const { FACTORIO_IMAGE_NAME, FACTORIO_TCP_PORT, FACTORIO_UDP_PORT } = require('../../constants');

exports.typeDefs = gql`
	extend type Query {
		games: [Game!]!
		availableVersions: [String!]!
	}

	extend type Mutation {
		createGame(game: CreateGameInput!): Game!
		deleteGame(gameId: ID!): Boolean
	}

	input CreateGameInput {
		name: String! @constraint(minLength: 3, maxLength: 40)
		version: String
	}

	type Game {
		id: ID!
		name: String! @constraint(minLength: 3, maxLength: 40)
		creator: User!
		version: String!
		createdAt: DateTime!
	}
`;

exports.resolvers = {
	Query: {
		games: authenticationResolver.createResolver(async (root, args, { dataSources }) => {
			const containers = await dataSources.docker.cli
				.command(`ps -af name=${process.env.CONTAINER_NAMESPACE}_`)
				.then(({ containerList }) => containerList.map(Docker.fromContainer));

			return Promise.all(containers
				.map(container => dataSources.db.knex('game')
					.where('container_id', 'like', `${container.containerId}%`)
					.select('id', 'creator_id', 'createdAt')
					.first()
					.then(Database.fromRecord)
					.then(record => ({ ...container, ...record }))))
				.then(xs => xs
					.filter(a => a.id)
					.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10)));
		}),

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

				// Create docker container
				const version = game.version || 'latest';
				const containerId = await dataSources.docker.cli.command([
					'run',
					'--detach',
					`--name ${Docker.toContainerName(game.name)}`,
					'--restart always',
					'--env ENABLE_GENERATE_NEW_MAP_SAVE=true',
					'--env SAVE_NAME=default',
					`--expose ${FACTORIO_TCP_PORT}/tcp`,
					`--expose ${FACTORIO_UDP_PORT}/udp`,
					`--volume ${path.resolve(containerVolumePath)}`,
					`${FACTORIO_IMAGE_NAME}:${game.version || 'latest'}`,
				]
					.join(' '))
					.then(result => result.containerId);

				// Stop container and remove temporary save file
				await dataSources.docker.cli.command(`stop ${containerId}`);
				await rmfr(path.join(containerVolumePath, 'saves', '*'));

				return dataSources.db.knex.transaction(trx => trx('game')
					.insert(Database.toRecord({
						containerId,
						version,
						name: game.name,
						creatorId: user.id,
					}))
					.then(() => trx('game')
						.innerJoin('user', 'user.id', 'game.creator_id')
						.select('game.*')
						.where('game.name', game.name)
						.first())
					.then(Database.fromRecord));
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
	},

	Game: {
		async creator(game, args, { dataSources }) {
			return dataSources.db.knex('user')
				.where('id', game.creatorId)
				.select('user.*')
				.first()
				.then(Database.fromRecord);
		},
	},
};
