import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { JwtPayload } from 'jsonwebtoken';

export type AuthUser = { userId: string; role: string };

export function extractUserFromToken(authHeader: string | null): AuthUser | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split(' ')[1] ?? '';
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload & {
      userId?: string;
      role?: string;
    };
    if (payload.userId && payload.role) return { userId: payload.userId, role: payload.role };
    return null;
  } catch {
    return null;
  }
}

export function extractUser(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization ?? null;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }
  const user = extractUserFromToken(authHeader);
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  req.user = user;
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  next();
}
