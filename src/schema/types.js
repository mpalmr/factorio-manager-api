import gql from 'graphql-tag';
import { DateTimeResolver } from 'graphql-scalars';

export const typeDefs = gql`
	scalar DateTime
`;

export const resolvers = {
	DateTime: DateTimeResolver,
};
