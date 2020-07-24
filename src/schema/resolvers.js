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

module.exports = {
	baseResolver,
	authenticationResolver,
	DuplicantError: createError('DuplicantError', {
		message: 'Duplicate record found',
	}),
};
