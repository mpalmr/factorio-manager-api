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

	directive @cacheControl(
		maxAge: Int
		scope: CacheControlScope
	) on FIELD_DEFINITION | OBJECT | INTERFACE

	enum CacheControlScope {
		PUBLIC
		PRIVATE
	}
`;
