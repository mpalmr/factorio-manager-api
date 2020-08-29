import { GraphQLScalarType, GraphQLError } from 'graphql';
import { Kind } from 'graphql/language';
import gql from 'graphql-tag';
import { baseResolver } from './resolvers';

function validateVersion(value) {
	if (/^/.test(value)) return value;
	throw new GraphQLError('Value is not a semver version in <major>.<minor>.<patch> format');
}

const VersionResolver = new GraphQLScalarType({
	name: 'Version',
	description: 'Semantic versioning schemed version: <major>.<minor>.<patch>',
	parseValue: validateVersion,
	serialize: validateVersion,
	parseLiteral(ast) {
		if (ast.kind !== Kind.STRING) throw new GraphQLError('Version must be a string');
		return validateVersion(ast.value);
	},
});

export const typeDefs = gql`
	scalar Version

	extend type Query {
		versions: [Version!]! @cacheControl(maxAge: 3600)
	}

	extend type Mutation {
		updateGameVersion(gameId: ID!, version: Version!): Game!
	}
`;

export const resolvers = {
	Version: VersionResolver,

	Query: {
		versions: baseResolver.createResolver(
			async (root, args, { dataSources }) => dataSources.dockerHub.getVersions(),
		),
	},
};
