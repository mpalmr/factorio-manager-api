'use strict';

const gql = require('graphql-tag');

module.exports = gql`
	scalar DateTime

	type Query {
		_empty: String
	}

	type Mutation {
		_empty: String
	}
`;
