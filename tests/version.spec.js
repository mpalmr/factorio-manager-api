import { createTestClient } from 'apollo-server-testing';
import gql from 'graphql-tag';
import { constructTestServer } from './util';

describe('Query', () => {
	describe('versions', () => {
		test('Returns available versions', async () => {
			const { query } = createTestClient(constructTestServer());

			const { data, errors } = await query({
				query: gql`
					query Versions {
						versions
					}
				`,
			});

			expect(errors).not.toBeDefined();
			expect(data.versions).toEqual(
				expect.arrayContaining(['latest', '0.13', '0.13-dev', '0.15.11']),
			);
		});
	});
});
