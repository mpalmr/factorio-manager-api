'use strict';

const gql = require('graphql-tag');
const { baseResolver } = require('../resolvers');

exports.typeDefs = gql`
	extend type Query {
		versions: [String!]! @cacheControl(maxAge: 3600)
	}

	extend type Mutation {
		updateGameVersion(gameId: ID!, version: String!): Game!
	}
`;

exports.resolvers = {
	Query: {
		versions: baseResolver.createResolver(
			async (root, args, { dataSources }) => dataSources.dockerHub.getVersions(),
		),
	},
};
