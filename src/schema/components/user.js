'use strict';

const argon = require('argon2');
const gql = require('graphql-tag');
const Database = require('../../data-sources/database');
const { baseResolver, InvalidCredentailsError } = require('../resolvers');

exports.typeDefs = gql`
	extend type Query {
		authToken(credentials: CredentialsInput): String!
	}

	extend type Mutation {
		createUser(user: CredentialsInput!): String!
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

exports.resolvers = {
	Query: {
		authToken: baseResolver.createResolver(async (root, { credentials }, { dataSources }) => {
			const { passwordHash, ...user } = await dataSources.db.knex('user')
				.where('username', credentials.username)
				.first()
				.then(Database.fromRecord);
			if (!await argon.verify(passwordHash, credentials.password)) {
				throw new InvalidCredentailsError();
			}
			return dataSources.db.createSession(user.id);
		}),
	},

	Mutation: {
		createUser: baseResolver.createResolver(async (root, { user }, { dataSources }) => {
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
		}),
	},
};
