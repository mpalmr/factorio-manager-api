import { ApolloError, AuthenticationError, ForbiddenError } from 'apollo-server';
import Database from '../data-sources/database';

export function isAuthenticated() {
	return next => async (parent, args, ctx, info) => {
		if (!ctx.sessionToken) throw new AuthenticationError('Unauthorized');
		const user = await ctx.dataSources.db.getSessionUser(ctx.sessionToken);
		if (!user) throw new AuthenticationError('Invalid credentials');
		return next(parent, args, { ...ctx, user }, info);
	};
}

export function resolveGame({ ownsGame = null, isOnline = null, isAdmin = null } = {}) {
	return next => async (parent, args, ctx, info) => {
		const game = await ctx.dataSources.db.knex('game')
			.where('id', args.gameId || args.game?.id)
			.first()
			.then(Database.fromRecord);

		if (!game) throw new ApolloError('Game not found');

		if (ownsGame === true && game.creatorId !== ctx.user.id) {
			throw new ForbiddenError('You do not have permissions to view this resource');
		}

		if (isAdmin) {
			const adminUsernames = await ctx.dataSources.adminList.get(game.name);
			if (!adminUsernames.includes(ctx.user)) throw new ForbiddenError('Must be an admin');
		}

		if (isOnline === true && !game.isOnline) {
			throw new ApolloError('Game must be online to perform this action');
		}
		if (isOnline === false && game.isOnline) {
			throw new ApolloError('Game must be offline to perform this action');
		}

		return next(parent, args, { ...ctx, game }, info);
	};
}
