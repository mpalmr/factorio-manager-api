'use strict';

const { makeExecutableSchema } = require('@graphql-tools/schema');
const { constraintDirective, constraintDirectiveTypeDefs } = require('graphql-constraint-directive');
const { UnsignedIntResolver, DateTimeResolver } = require('graphql-scalars');
const baseTypeDefs = require('./base-typedefs');
const user = require('./components/user');
const game = require('./components/game');

function applySchemaComponent(base, ...components) {
	return components.reduce((acc, { typeDefs, resolvers }) => {
		const { Query, Mutation, ...otherResolvers } = resolvers;
		return {
			...acc,
			typeDefs: acc.typeDefs.concat(typeDefs),
			resolvers: {
				...acc.resolvers,
				Query: {
					...acc.resolvers.Query,
					...resolvers.Query,
				},
				Mutation: {
					...acc.resolvers.Mutation,
					...resolvers.Mutation,
				},
				...otherResolvers,
			},
		};
	}, base);
}

module.exports = function createSchema() {
	return makeExecutableSchema(applySchemaComponent({
		typeDefs: [constraintDirectiveTypeDefs, baseTypeDefs],
		schemaTransforms: [constraintDirective()],
		resolvers: {
			DateTime: DateTimeResolver,
			UnsignedInt: UnsignedIntResolver,
			Query: {},
			Mutation: {},
		},
	}, user, game));
};
