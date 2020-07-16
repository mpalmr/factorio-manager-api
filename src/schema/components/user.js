'use strict';

const argon = require('argon2');
const gql = require('graphql-tag');
const { baseResolver, InvalidCredentailsError } = require('../resolvers');
const { createToken } = require('../../util');

exports.typeDefs = gql`
	extend type Mutation {
		createUser(user: CredentialsInput!): String!
		createAuthToken(credentials: CredentialsInput!): String!
		invalidateAuthToken(authToken: String!): Boolean!
	}

	input CredentialsInput {
		username: String! @constraint(minLength: 3, maxLength: 40)
		password: String! @constraint(minLength: 6)
	}

	type User {
		id: ID!
		username: String! @constraint(minLength: 3, maxLength: 40)
		createdAt: DateTime!
	}
`;

const createSessionResolver = baseResolver.createResolver(async (root, args, ctx) => {
	ctx.createSession = async userId => {
		const token = await createToken();
		await ctx.dataSources.db.createSession(userId, token);
		return token;
	};
});

exports.resolvers = {
	Mutation: {
		createAuthToken: createSessionResolver
			.createResolver(async (root, { credentials }, { dataSources, createSession }) => {
				const user = await dataSources.db.verifyUser(credentials.username, credentials.password);
				if (!user) throw new InvalidCredentailsError();
				return createSession(user.id);
			}, () => {
				throw new InvalidCredentailsError();
			}),

		createUser: createSessionResolver
			.createResolver(async (root, { user }, { dataSources, createSession }) => {
				const { password, ...xs } = user;
				const userId = await dataSources.db.createUser({
					...xs,
					passwordHash: await argon.hash(password),
				});
				return createSession(userId);
			}),
	},
};
