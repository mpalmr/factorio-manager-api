import { createError } from 'apollo-errors';
import argon from 'argon2';
import gql from 'graphql-tag';
import Database from '../../data-sources/database';
import { baseResolver, DuplicateError } from '../resolvers';

export const typeDefs = gql`
	extend type Mutation {
		createUser(user: CredentialsInput!): String!
		createAuthToken(credentials: CredentialsInput!): String!
		invalidateAuthToken(token: String!): Boolean
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

const InvalidCredentialsError = createError('InvalidCredentialsError', {
	message: 'Invalid credentials',
});

export const resolvers = {
	Mutation: {
		createUser: baseResolver.createResolver(
			async (root, { user }, { dataSources }) => {
				const { password, ...xs } = user;

				const userId = await dataSources.db.knex('user')
					.insert(Database.toRecord({
						...xs,
						passwordHash: await argon.hash(password),
					}))
					.then(() => dataSources.db.knex('user')
						.where('username', user.username)
						.first()
						.then(userRecord => userRecord.id));

				return dataSources.db.createSession(userId);
			},
			(parents, args, ctx, error) => {
				if (error.message.includes('SQLITE_CONSTRAINT')) throw new DuplicateError();
				throw new InvalidCredentialsError();
			},
		),

		createAuthToken: baseResolver.createResolver(async (root, { credentials }, { dataSources }) => {
			const { passwordHash, ...user } = await dataSources.db.knex('user')
				.where('username', credentials.username)
				.first()
				.then(Database.fromRecord);
			if (!await argon.verify(passwordHash, credentials.password)) {
				throw new InvalidCredentialsError();
			}
			return dataSources.db.createSession(user.id);
		}),

		invalidateAuthToken: baseResolver.createResolver(
			async (root, { token }, { dataSources }) => dataSources.db.session(token)
				.update('invalidated', true)
				.then(() => null),
		),
	},
};
