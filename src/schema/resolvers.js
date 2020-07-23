'use strict';

const { createResolver } = require('apollo-resolvers');
const { createError, isInstance: isApolloError } = require('apollo-errors');

const UnknownError = createError('UnknownError', { message: 'An unknown error has occured' });

const baseResolver = createResolver(
	null,
	(parent, args, ctx, error) => (isApolloError(error) || process.env.NODE_ENV !== 'prouction'
		? error
		: new UnknownError(error)),
);

const InvalidCredentailsError = createError('InvalidCredentailsError', {
	message: 'Invalid credentails',
});

const authenticationResolver = baseResolver.createResolver(async (parent, args, ctx) => {
	ctx.user = await ctx.dataSources.db.knex('session')
		.innerJoin('user', 'user.id', 'session.user_id')
		.where('session.token', ctx.sessionToken)
		.where('session.expires', '>=', Date.now())
		.select('user.*')
		.first();
	if (!ctx.user) throw new InvalidCredentailsError();
});

module.exports = {
	baseResolver,
	authenticationResolver,
	InvalidCredentailsError,
};
