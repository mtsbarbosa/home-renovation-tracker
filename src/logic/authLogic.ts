import config from '../config.js';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.js';

export function generateToken(user: User) {
  return jwt.sign({ userId: user.id, role: user.role }, config.jwtSecret, { expiresIn: '1h' });
}
