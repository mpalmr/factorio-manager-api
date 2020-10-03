import { composeResolvers } from '@graphql-tools/resolvers-composition';
import gql from 'graphql-tag';
import Database from '../data-sources/database';
import Docker from '../data-sources/docker';
import { isAuthenticated, resolveGame } from './resolvers';

export const typeDefs = gql`
	extend type Mutation {
		startGame(gameId: ID!): Game!
		stopGame(gameId: ID!): Game!
	}

	extend type Game {
		isOnline: Boolean!
	}
`;

function createUpdateStateResolver(action) {
	return async (root, args, { dataSources, game }) => dataSources.docker.cli
		.command(`${action} ${Docker.toContainerName(game.name)}`)
		.then(() => ({ ...game, isOnline: action === 'start' }));
}

export const resolvers = composeResolvers({
	Mutation: {
		startGame: createUpdateStateResolver('start'),
		stopGame: createUpdateStateResolver('stop'),
	},
	Game: {
		async isOnline(game, args, { dataSources }) {
			return dataSources.db.knex('user')
				.where('id', game.creatorId)
				.select('user.*')
				.first()
				.then(Database.fromRecord);
		},
	},
}, {
	Mutation: {
		startGame: [isAuthenticated(), resolveGame({
			ownsGame: true,
			isOnline: false,
		})],
		stopGame: [isAuthenticated(), resolveGame({
			ownsGame: true,
			isOnline: false,
		})],
	},
});
