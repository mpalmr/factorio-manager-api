'use strict';

const { createResolver } = require('apollo-resolvers');
const { createError, isInstance: isApolloError } = require('apollo-errors');
const Database = require('../data-sources/database');

const UnknownError = createError('UnknownError', { message: 'An unknown error has occured' });

const baseResolver = createResolver(
	null,
	(parent, args, ctx, error) => (isApolloError(error) || process.env.NODE_ENV !== 'prouction'
		? error
		: new UnknownError(error)),
);

const UnauthorizedError = createError('UnauthorizedError', {
	message: 'You must be logged in to view this resource',
});

const authenticationResolver = baseResolver.createResolver(async (parent, args, ctx) => {
	if (!ctx.sessionToken) throw new UnauthorizedError();
	ctx.user = await ctx.dataSources.db.session(ctx.sessionToken)
		.innerJoin('user', 'user.id', 'session.user_id')
		.select('user.*')
		.first();
	if (!ctx.user) throw new UnauthorizedError();
});

const NotFoundError = createError('NotFoundError', {
	message: 'Resource could not be found',
});

const ForbiddenError = createError('ForbiddenError', {
	message: 'You do not have permissions to view this resource',
});

const isGameOwnerResolver = authenticationResolver.createResolver(
	async (parent, { gameId }, ctx) => {
		ctx.game = await ctx.dataSources.db.knex('game')
			.where('id', parseInt(gameId, 10))
			.first()
			.then(Database.fromRecord);
		if (!ctx.game) throw new NotFoundError();
		if (ctx.game.creatorId !== ctx.user.id) throw new ForbiddenError();
	},
);

module.exports = {
	baseResolver,
	authenticationResolver,
	isGameOwnerResolver,
	NotFoundError,
	ForbiddenError,
	DuplicateError: createError('DuplicateError', {
		message: 'Duplicate record found',
	}),
};
