import { makeExecutableSchema } from '@graphql-tools/schema';
import gql from 'fake-tag';
import * as scalars from './scalars';
import * as auth from './auth';
import * as game from './game';
import * as version from './version';

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
		typeDefs: [
			baseTypeDefs,
			scalars.typeDefs,
			auth.typeDefs,
			game.typeDefs,
			version.typeDefs,
		],
		resolvers: [
			scalars.resolvers,
			auth.resolvers,
			game.resolvers,
			version.resolvers,
		],
	});
}
