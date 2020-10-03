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
				expect.arrayContaining(['0.15.11', '1.0.0']),
			);
		});
	});
});
