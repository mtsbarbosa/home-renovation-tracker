import type { PingResult } from '../models/ping.js';
import { createPingResult } from '../logic/ping.js';

/** Controller: glues logic. Returns model for port to adapt. */
export async function getPing(): Promise<PingResult> {
  return createPingResult();
}
