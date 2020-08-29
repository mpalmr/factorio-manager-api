import gql from 'graphql-tag';
import { AuthenticationError } from 'apollo-server';
import { composeResolvers } from '@graphql-tools/resolvers-composition';
import { isAuthenticated } from './resolvers';

export const typeDefs = gql`
	extend type Mutation {
		login(credentials: Credentials!): String!
		logout: Boolean
	}

	input Credentials {
		username: String!
		password: String!
	}

	type User {
		id: ID!
		username: String!
		createdAt: DateTime!
	}
`;

export const resolvers = composeResolvers({
	Mutation: {
		async login(root, { credentials }, { dataSources }) {
			const token = await dataSources.factorioAuth.login(credentials);
			if (!token) throw new AuthenticationError('Invalid credentials');
			await dataSources.db.createSession(credentials.username, token);
			return token;
		},

		async logout(root, args, { dataSources, user }) {
			await dataSources.db.knex('session').update('token', null).where('user_id', user.id);
			return null;
		},
	},
}, {
	Mutation: {
		logout: [isAuthenticated()],
	},
});
