'use strict';

const path = require('path');
const fs = require('fs').promises;
const gql = require('graphql-tag');
const Docker = require('../../data-sources/docker');
const { authenticationResolver, DuplicantError } = require('../resolvers');

exports.typeDefs = gql`
	extend type Query {
		games: [Game!]!
	}

	extend type Mutation {
		createGame(game: CreateGameInput!): Game!
	}

	input CreateGameInput {
		name: String! @constraint(minLength: 3, maxLength: 40)
	}

	type Game {
		id: ID!
		name: String! @constraint(minLength: 3, maxLength: 40)
		creator: User!
		version: String! @constraint(minLength: 5, pattern: "^(\d+\.){2}\d+$")
		createdAt: DateTime!
	}
`;

exports.resolvers = {
	Query: {
		games: authenticationResolver.createResolver(
			async (root, args, { datasources }) => datasources.docker.list(),
		),
	},

	Mutation: {
		createGame: authenticationResolver.createResolver(async (root, { game }, { dataSources }) => {
			const containerVolumePath = path.resolve(`${process.env.VOLUME_ROOT}/${game.name}`);
			await fs.access(containerVolumePath)
				.catch(ex => (ex.code === 'ENOENT' ? null : Promise.reject(new DuplicantError())));
			await fs.mkdir(containerVolumePath);

			const name = Docker.toContainerName(game.name);
			await dataSources.docker.command([
				'run',
				'--detatch',
				`--name ${name}`,
				'--restart always',
				'--env ENABLE_GENERATE_NEW_MAP_SAVE=true',
				'--env SAVE_NAME=tmp',
				`--volume ${containerVolumePath}`,
			]
				.join(' '));
		}),
	},
};
