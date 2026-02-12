import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateToken } from './authLogic.js';
import { UserRole } from '../models/user.js';

vi.mock('../config.js', () => ({ default: { jwtSecret: 'test-secret' } }));

describe('generateToken', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-02-11T12:00:00.000Z'));
  });

  it('returns a JWT string for user', () => {
    const user = {
      id: 'user-1',
      email: 'a@b.com',
      password_hash: 'hash',
      name: 'Test',
      role: UserRole.CONTRACTOR,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const token = generateToken(user);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });
});
