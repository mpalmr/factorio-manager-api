import gql from 'graphql-tag';
import { baseResolver } from './resolvers';

export const typeDefs = gql`
	extend type Query {
		versions: [Version!]! @cacheControl(maxAge: 3600)
	}

	extend type Mutation {
		updateGameVersion(gameId: ID!, version: Version!): Game!
	}
`;

export const resolvers = {
	Query: {
		versions: baseResolver.createResolver(
			async (root, args, { dataSources }) => dataSources.dockerHub.getVersions(),
		),
	},
};
