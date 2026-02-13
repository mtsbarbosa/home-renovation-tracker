import type { PingResult } from '../models/ping.js';

/** Pure function - unit-testable, no side effects */
export function createPingResult(): PingResult {
  return {
    message: 'pong',
    timestamp: new Date().toISOString(),
  };
}
