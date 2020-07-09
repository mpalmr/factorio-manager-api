'use strict';

const { ApolloServer } = require('apollo-server');
const { formatError } = require('apollo-errors');
const gql = require('graphql-tag');
const defaultContext = require('../src/context');
const dataSources = require('../src/datasources');
const createSchema = require('../src/schema');

exports.constructTestServer = function ({ context = defaultContext } = {}) {
	return new ApolloServer({
		formatError,
		context,
		dataSources,
		schema: createSchema(),
	});
};

exports.createUser = async function (mutate) {
	return mutate({
		mutation: gql`
			mutation CreateUser($user: CredentialsInput!) {
				createUser(user: $user)
			}
		`,
		variables: {
			user: {
				username: 'BobSaget',
				password: 'P@ssw0rd',
			},
		},
	})
		.then(({ data, errors }) => {
			if (!data) {
				console.error(errors);
				throw new Error(errors[0]);
			}
			return data;
		});
};
