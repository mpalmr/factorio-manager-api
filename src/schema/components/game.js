'use strict';

const gql = require('graphql-tag');
const { authenticationResolver } = require('../resolvers');

exports.typeDefs = gql`
	extend type Query {
		games: [Game!]!
	}

	extend type Mutation {
		createGame: Game!
	}

	type Game {
		id: ID!
		name: String! @constraint(minLength: 3, maxLength: 40)
		creator: User!
		version: String! @constraint(minLength: 5, pattern: "^(\d+\.){2}\d+$")
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
		createGame: authenticationResolver.createResolver(async () => null),
	},
};
