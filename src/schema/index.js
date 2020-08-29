import { makeExecutableSchema } from '@graphql-tools/schema';
import gql from 'fake-tag';
import { DateTimeResolver, PortResolver } from 'graphql-scalars';
import * as auth from './auth';
import * as game from './game';
import * as version from './version';

const baseTypeDefs = gql`
	scalar DateTime
	scalar Port

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

const baseResolvers = {
	DateTime: DateTimeResolver,
	Port: PortResolver,
};

export default function createSchema() {
	return makeExecutableSchema({
		typeDefs: [
			baseTypeDefs,
			auth.typeDefs,
			game.typeDefs,
			version.typeDefs,
		],
		resolvers: [
			baseResolvers,
			auth.resolvers,
			game.resolvers,
			version.resolvers,
		],
	});
}
