import { ApolloServer } from 'apollo-server';
import responseCachePlugin from 'apollo-server-plugin-response-cache';
import createSchema from './schema';
import dataSources from './data-sources';

export default function createServer() {
	const server = new ApolloServer({
		dataSources,
		schema: createSchema(),
		plugins: [responseCachePlugin()],
		context({ req }) {
			const sessionToken = req.get('Authorization') || null;
			return { sessionToken: sessionToken && sessionToken.replace(/^Bearer\s/, '') };
		},
	});

	server.listen().then(({ url }) => {
		console.info(`Apollo listening on: ${url}`);
	});

	return server;
}
