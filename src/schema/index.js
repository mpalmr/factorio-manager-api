import { makeExecutableSchema } from '@graphql-tools/schema';
import { constraintDirective, constraintDirectiveTypeDefs } from 'graphql-constraint-directive';
import gql from 'fake-tag';
import * as types from './types';
import * as user from './components/user';
import * as game from './components/game';
import * as version from './components/version';

const baseTypeDefs = gql`
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

export default function createSchema() {
	return makeExecutableSchema({
		schemaTransforms: [constraintDirective()],
		typeDefs: [
			constraintDirectiveTypeDefs,
			baseTypeDefs,
			types.typeDefs,
			user.typeDefs,
			game.typeDefs,
			version.typeDefs,
		],
		resolvers: [
			types.resolvers,
			user.resolvers,
			game.resolvers,
			version.resolvers,
		],
	});
}
