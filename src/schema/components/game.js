'use strict';

const path = require('path');
const fs = require('fs').promises;
const gql = require('graphql-tag');
const sh = require('shelljs');
const { baseResolver, authenticationResolver } = require('../resolvers');

exports.typeDefs = gql`
	extend type Query {
		games: [Game!]!
	}

	extend type Mutation {
		createGame(game: CreateGameInput!): Game!
	}

	input CreateGameInput {
		name: String! @constraint(minLength: 3, maxLength: 40)
		version: String @constraint(pattern: "^(latest|(\d+\.){2}\d+)$")
	}

	type Game {
		id: ID!
		name: String! @constraint(minLength: 3, maxLength: 40)
		version: String! @constraint(pattern: "^(\d+\.){2}\d+$")
		isOnline: Boolean!
		creator: User!
		createdAt: DateTime!
	}
`;

exports.resolvers = {
	Query: {
		games: authenticationResolver.createResolver(
			async (root, args, { dataSources }) => dataSources.docker.list(),
		),
	},

	Mutation: {
		createGame: authenticationResolver.createResolver(
			async (root, args, { dataSources, user }) => {
				const { version, ...game } = args.game;

				// Create a game in the database pending a transaction's successful completion
				await dataSources.db.transaction();
				const gameId = await dataSources.db.createGame({ ...game, creatorId: user.id });

				// Make directory for volume to "live" within
				const containerPath = path.resolve(`containers/${gameId}`);
				await fs.mkdir(containerPath);

				// Builder docker container and commit the gam to the databae
				return dataSources.docker.build(gameId, containerPath, version)
					.then(() => dataSources.db.getGameById(gameId))
					.then(newGameRecord => dataSources.db.commit()
						.then(() => newGameRecord))
					.catch(ex => {
						sh.rm('-rf', containerPath); // Remove volume on failure
						return Promise.reject(ex);
					});
			},
		),
	},

	Game: {
		async creator(game, args, { dataSources, user }) {
			return dataSources.db.getUserById(user.id);
		},

		version: baseResolver.createResolver(
			async (game, args, { dataSources }) => dataSources.db.getImageVersion(game.name),
		),
	},
};
