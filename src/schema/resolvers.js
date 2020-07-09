'use strict';

const { createResolver } = require('apollo-resolvers');
const { createError, isInstance: isApolloError } = require('apollo-errors');

const UnknownError = createError('UnknownError', { message: 'An unknown error has occured' });

const baseResolver = createResolver(null, (parent, args, ctx, error) => {
	if (process.env.NODE_ENV !== 'production') console.error(error);
	return isApolloError(error) ? error : new UnknownError(error);
});

const InvalidCredentailsError = createError('InvalidCredentailsError', {
	message: 'Invalid credentails',
});

const authenticationResolver = baseResolver.createResolver(
	async (parent, args, ctx) => {
		const user = await ctx.dataSources.getSessionUser(ctx.sessionToken);
		if (!user) throw new InvalidCredentailsError();
		ctx.user = user;
	},
	() => {
		throw new InvalidCredentailsError();
	},
);

module.exports = {
	baseResolver,
	authenticationResolver,
	InvalidCredentailsError,
};
