import { describe, it, expect } from 'vitest';
import { toGraphqlPingResult } from './ping.js';

describe('toGraphqlPingResult', () => {
  it('converts model to GraphQL port schema', () => {
    const model = { message: 'pong', timestamp: '2024-02-11T12:00:00.000Z' };
    expect(toGraphqlPingResult(model)).toEqual({
      message: 'pong',
      timestamp: '2024-02-11T12:00:00.000Z',
    });
  });
});
