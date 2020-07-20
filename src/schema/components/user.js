'use strict';

const argon = require('argon2');
const gql = require('graphql-tag');
const argon2 = require('argon2');
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

async function createSession(db, userId) {
	const token = await createToken();
	await db.createSession(userId, token);
	return token;
}

exports.resolvers = {
	Mutation: {
		createAuthToken: baseResolver
			.createResolver(async (root, { credentials }, { dataSources }) => {
				const { passwordHash, ...user } = await dataSources.db.getUser(credentials.username);
				if (!await argon2.verify(passwordHash, credentials.password)) {
					throw new InvalidCredentailsError();
				}
				return createSession(dataSources.db, user.id);
			}),

		createUser: baseResolver.createResolver(async (root, { user }, { dataSources }) => {
			const { password, ...xs } = user;
			const userId = await dataSources.db.createUser({
				...xs,
				passwordHash: await argon.hash(password),
			});
			return createSession(dataSources.db, userId);
		}),
	},
};
