'use strict';

const path = require('path');
const fs = require('fs').promises;
const gql = require('graphql-tag');
const sh = require('shelljs');
const { authenticationResolver, ForbiddenError } = require('../resolvers');

exports.typeDefs = gql`
	extend type Query {
		games: [Game!]!
	}

	extend type Mutation {
		createGame(game: CreateGameInput!): Game!
		deactivateGame(gameId: ID!): Boolean
	}

	input CreateGameInput {
		name: String! @constraint(minLength: 3, maxLength: 40)
		version: String @constraint(pattern: "^(latest|(\d+\.){2}\d+)$")
		tcpPort: Int @constraint(min: 1024, max: 65535)
		udpPort: Int @constraint(min: 1024, max: 65535)
	}

	type Game {
		id: ID!
		name: String! @constraint(minLength: 3, maxLength: 40)
		version: String! @constraint(pattern: "^(latest|(\d+\.){2}\d+)$")
		tcpPort: Int! @constraint(min: 1024, max: 65535)
		isOnline: Boolean!
		creator: User!
		createdAt: DateTime!
	}
`;

const isCreatorResolver = authenticationResolver.createResolver(
	async (root, { gameId, game }, { dataSources, user }) => {
		const gameRecord = await dataSources.db.getGameById(gameId || game.id);
		if (gameRecord.creatorId !== user.id) throw new ForbiddenError();
	},
);

exports.resolvers = {
	Query: {
		games: authenticationResolver.createResolver(
			async (root, args, { dataSources }) => dataSources.docker.list(),
		),
	},

	Mutation: {
		createGame: authenticationResolver.createResolver(
			async (root, { game }, { dataSources, user }) => {
				// Create game record
				const gameRecord = await dataSources.db.createGame(game, user.id);

				// Build container
				const containerVolumePath = path.resolve(`containers/${gameRecord.id}`);
				await fs.mkdir(containerVolumePath);
				await dataSources.docker.run(gameRecord, containerVolumePath).catch(ex => {
					sh.rm('-rf', containerVolumePath);
					return Promise.reject(ex);
				});

				return {
					...gameRecord,
					isOnline: false,
				};
			},
		),

		deactivateGame: isCreatorResolver.createResolver(
			async (root, { gameId }, { dataSources }) => dataSources.db.deactivateGame(gameId)
				.then(() => null),
		),
	},

	Game: {
		async creator(game, args, { dataSources, user }) {
			return dataSources.db.getUserById(user.id);
		},
	},
};
