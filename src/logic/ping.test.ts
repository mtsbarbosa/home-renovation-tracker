import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPingResult } from './ping.js';

describe('createPingResult', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-02-11T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns pong message and ISO timestamp', () => {
    const result = createPingResult();
    expect(result.message).toBe('pong');
    expect(result.timestamp).toBe('2024-02-11T12:00:00.000Z');
  });
});
