import { db } from '../../db/index.js';
import { User } from '../../models/user.js';

export function getUserById(id: string) {
  return db('users').where('id', id).first();
}

export function getUserByEmail(email: string) {
  return db.from('users').where('email', email).first();
}

export async function createUser(user: User): Promise<void> {
  await db('users').insert({
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    name: user.name,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
  });
}

export function revokeToken(token: string) {
  return db.from('tokens').where('token', token).delete();
}
