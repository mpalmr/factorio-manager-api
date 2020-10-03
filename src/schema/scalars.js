import { GraphQLScalarType, GraphQLError } from 'graphql';
import { Kind } from 'graphql/language';
import gql from 'graphql-tag';
import { UnsignedIntResolver, DateTimeResolver, PortResolver } from 'graphql-scalars';

// TODO: Try out ValidationError within apollo-server
function validateGameName(value) {
	const trimmedValue = value.trim();
	if (!/^[a-z\d\s_-]+$/i.test(trimmedValue)) {
		throw new GraphQLError(
			'Game name can only contain letters, numbers, spaces, underscores, and dashes',
		);
	}
	return trimmedValue;
}

const GameNameResolver = new GraphQLScalarType({
	name: 'GameName',
	description: 'Name of the game for users to identify their specific factories',
	parseValue: validateGameName,
	serialize: validateGameName,
	parseLiteral(ast) {
		if (ast.kind === Kind.STRING) return validateGameName(ast.value);
		throw new GraphQLError('Invalid game name');
	},
});

function validateVersion(value) {
	if (value !== 'latest' && !/^((\d+\.){2}\d+)$/.test(value)) {
		throw new GraphQLError('Value is not a semver version in <major>.<minor>.<patch> format');
	}
	return value;
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
	scalar Upload
	scalar UnsignedInt
	scalar DateTime
	scalar Port
	scalar GameName
	scalar Version
`;

export const resolvers = {
	UnsignedInt: UnsignedIntResolver,
	DateTime: DateTimeResolver,
	Port: PortResolver,
	GameName: GameNameResolver,
	Version: VersionResolver,
};
