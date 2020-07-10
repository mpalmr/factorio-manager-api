'use strict';

const path = require('path');
const fs = require('fs').promises;
const gql = require('graphql-tag');
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
	}

	type Game {
		id: ID!
		name: String! @constraint(minLength: 3, maxLength: 40)
		creator: User!
		version: String! @constraint(minLength: 5, pattern: "^(\d+\.){2}\d+$")
		isOnline: Boolean!
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
			async (root, { game }, { dataSources }) => dataSources.db.createGame(game, async id => {
				const containerPath = path.resolve(`containers/${id}`);
				await fs.mkdir(containerPath);
				return dataSources.docker.build(id, containerPath);
			}),
		),
	},

	Game: {
		async creator(game, args, { dataSources, user }) {
			return dataSources.db.getUserById(user.id);
		},
	},
};
