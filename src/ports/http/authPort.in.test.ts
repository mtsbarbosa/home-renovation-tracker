import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import { createAuthPortInRoutes } from './authPort.in.js';
import * as authPortOut from '../sql/authPort.out.js';

vi.mock('../sql/authPort.out.js');

const app = express();
app.use(express.json());
app.use('/auth', createAuthPortInRoutes());

describe('Auth port (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /auth/signin', () => {
    it('returns token on valid credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      vi.mocked(authPortOut.getUserByEmail).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        password_hash: passwordHash,
        name: 'Test User',
        role: 'contractor',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await request(app)
        .post('/auth/signin')
        .send({ email: 'user@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Signed in successfully');
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe('string');
    });

    it('returns 400 on missing email or password', async () => {
      const res = await request(app).post('/auth/signin').send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Email and password are required');
    });

    it('returns 401 on invalid credentials', async () => {
      vi.mocked(authPortOut.getUserByEmail).mockResolvedValue(null);

      const res = await request(app)
        .post('/auth/signin')
        .send({ email: 'user@example.com', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('returns 401 on wrong password', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      vi.mocked(authPortOut.getUserByEmail).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        password_hash: passwordHash,
        name: 'Test User',
        role: 'contractor',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await request(app)
        .post('/auth/signin')
        .send({ email: 'user@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });
  });

  describe('POST /auth/signup', () => {
    it('returns success on valid signup', async () => {
      vi.mocked(authPortOut.getUserByEmail).mockResolvedValue(null);
      vi.mocked(authPortOut.createUser).mockResolvedValue(undefined);

      const res = await request(app).post('/auth/signup').send({
        email: 'new@example.com',
        password: 'secret123',
        name: 'New User',
        role: 'homeowner',
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('User created successfully');
      expect(authPortOut.createUser).toHaveBeenCalled();
    });

    it('returns 409 when email already exists', async () => {
      vi.mocked(authPortOut.getUserByEmail).mockResolvedValue({
        id: 'user-1',
        email: 'existing@example.com',
        password_hash: 'hash',
        name: 'Existing',
        role: 'contractor',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await request(app).post('/auth/signup').send({
        email: 'existing@example.com',
        password: 'secret123',
        name: 'New User',
        role: 'homeowner',
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Email already registered');
      expect(authPortOut.createUser).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/signout', () => {
    it('returns success on signout', async () => {
      vi.mocked(authPortOut.revokeToken).mockResolvedValue(undefined as never);

      const res = await request(app).post('/auth/signout').send({ token: 'some-jwt-token' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Signed out successfully');
      expect(authPortOut.revokeToken).toHaveBeenCalledWith('some-jwt-token');
    });
  });
});
