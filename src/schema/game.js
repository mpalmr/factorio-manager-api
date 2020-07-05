'use strict';

const gql = require('graphql-tag');

exports.typeDefs = gql`
	type Query {
		games: [Game!]!
	}

	type Game {
		id: ID!
		name: String!
		createdAt: DateTime!
	}
`;

exports.resolvers = {
	Query: {
		async games() {
			return null;
		},
	},
};
