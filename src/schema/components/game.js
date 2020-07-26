'use strict';

const path = require('path');
const fs = require('fs').promises;
const rmfr = require('rmfr');
const gql = require('graphql-tag');
const Database = require('../../data-sources/database');
const Docker = require('../../data-sources/docker');
const { authenticationResolver, DuplicateError } = require('../resolvers');
const { FACTORIO_IMAGE_NAME, FACTORIO_TCP_PORT, FACTORIO_UDP_PORT } = require('../../constants');

exports.typeDefs = gql`
	extend type Query {
		games: [Game!]!
	}

	extend type Mutation {
		createGame(game: CreateGameInput!): Game!
	}

	input CreateGameInput {
		name: String! @constraint(minLength: 3, maxLength: 40)
	}

	type Game {
		id: ID!
		name: String! @constraint(minLength: 3, maxLength: 40)
		creator: User!
		version: String! @constraint(pattern: "^(latest|([0-9]+\.){2}[0-9]+)$")
		createdAt: DateTime!
	}
`;

exports.resolvers = {
	Query: {
		games: authenticationResolver.createResolver(
			async (root, args, { datasources }) => datasources.docker.list(),
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
