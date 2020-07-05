'use strict';

const { makeExecutableSchema } = require('@graphql-tools/schema');
const { constraintDirective, constraintDirectiveTypeDefs } = require('graphql-constraint-directive');
const { DateTimeResolver } = require('graphql-scalars');
const baseTypeDefs = require('./base-typedefs');
const game = require('./game');

module.exports = async function createSchema() {
	return makeExecutableSchema({
		typeDefs: [
			constraintDirectiveTypeDefs,
			baseTypeDefs,
			game.typeDefs,
		],
		schemaTransforms: [constraintDirective()],
		resolvers: {
			DateTime: DateTimeResolver,
			...game.resolvers,
		},
	});
};
