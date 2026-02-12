import { describe, it, expect } from 'vitest';
import { createYoga } from 'graphql-yoga';
import { createGraphqlPort } from './graphqlPort.js';

describe('GraphQL port (integration)', () => {
  it('ping query returns pong via controller → adapter', async () => {
    const yoga = createYoga({
      schema: createGraphqlPort(),
      graphiql: false,
    });
    const res = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'query { ping { message timestamp } }' }),
    });
    const json = (await res.json()) as {
      data?: { ping?: { message?: string; timestamp?: string } };
    };
    expect(json.data?.ping?.message).toBe('pong');
    expect(typeof json.data?.ping?.timestamp).toBe('string');
  });
});
