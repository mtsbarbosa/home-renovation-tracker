import type { PingResult } from '../models/ping.js';
import type { PingGraphqlResult } from '../ports/schemas/ping.js';

/** Adapter: model → port schema. Called only inside port files. */
export function toGraphqlPingResult(model: PingResult): PingGraphqlResult {
  return {
    message: model.message,
    timestamp: model.timestamp,
  };
}
