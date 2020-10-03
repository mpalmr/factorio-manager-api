import gql from 'graphql-tag';

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
		async versions(root, args, { dataSources }) {
			return dataSources.dockerHub.getVersions();
		},
	},
};
