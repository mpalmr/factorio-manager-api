import { AuthenticationError } from 'apollo-server';
import { createResolver } from 'apollo-resolvers';
import { createError, isInstance as isApolloError } from 'apollo-errors';
import Database from '../data-sources/database';

export const DuplicateError = createError('DUplicateError', {
	message: 'Duplicate record found',
});

const UnknownError = createError('UnknownError', { message: 'An unknown error has occured' });

export const baseResolver = createResolver(
	null,
	(parent, args, ctx, error) => (isApolloError(error) || process.env.NODE_ENV !== 'prouction'
		? error
		: new UnknownError(error)),
);

const UnauthorizedError = createError('UnauthorizedError', {
	message: 'You must be logged in to view this resource',
});

export const authenticationResolver = baseResolver.createResolver(async (parent, args, ctx) => {
	if (!ctx.sessionToken) throw new UnauthorizedError();
	ctx.user = await ctx.dataSources.db.session(ctx.sessionToken)
		.innerJoin('user', 'user.id', 'session.user_id')
		.select('user.*')
		.first();
	if (!ctx.user) throw new UnauthorizedError();
});

export function isAuthenticated() {
	return next => async (parent, args, ctx, info) => {
		if (!ctx.sessionToken) throw new AuthenticationError('Unauthorized');
		const user = await ctx.dataSources.db.knex('user')
			.innerJoin('session', 'session.user_id', 'user.id')
			.where('session.token', ctx.sessionToken)
			.select('user.*')
			.first()
			.then(Database.fromRecord);
		if (!user) throw new AuthenticationError('Invalid credentials');
		return next(parent, args, { ...ctx, user }, info);
	};
}
