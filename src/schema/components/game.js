'use strict';

const path = require('path');
const fs = require('fs').promises;
const gql = require('graphql-tag');
const sh = require('shelljs');
const { authenticationResolver } = require('../resolvers');

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
		version: String! @constraint(pattern: "^(latest|(\d+\.){2}\d+)$")
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
			async (root, { game }, { dataSources, user }) => {
				const gameRecord = await dataSources.db.createGame(game, user.id)
					.then(gameId => dataSources.db.getGameById(gameId));

				const containerVolumePath = path.resolve(`containers/${gameRecord.id}`);
				await fs.mkdir(containerVolumePath);

				await dataSources.docker.build(gameRecord, containerVolumePath).catch(ex => {
					sh.rm('-rf', containerVolumePath);
					return Promise.reject(ex);
				});

				return {
					...gameRecord,
					isOnline: false,
				};
			},
		),
	},

	Game: {
		async creator(game, args, { dataSources, user }) {
			return dataSources.db.getUserById(user.id);
		},
	},
};
