'use strict';

const gql = require('graphql-tag');

module.exports = gql`
	scalar UnsignedInt
	scalar DateTime

	type Query {
		_empty: String
	}

	type Mutation {
		_empty: String
	}
`;
