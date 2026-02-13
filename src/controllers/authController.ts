import { getUserByEmail, createUser, revokeToken } from '../ports/sql/authPort.out.js';
import { SignInRequest, SignUpRequest, SignOutRequest } from '../ports/schemas/auth.js';
import { generateToken } from '../logic/authLogic.js';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { UserRole } from '../models/user.js';

export async function signin(data: SignInRequest): Promise<{
  token: string | null;
  error: string | null;
  errorCode: number | null;
}> {
  const { email, password } = data;
  const user = await getUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return { error: 'Invalid email or password', errorCode: 401, token: null };
  } else {
    const token = await generateToken(user);
    return { error: null, errorCode: null, token: token };
  }
}

export async function signup(data: SignUpRequest): Promise<{
  error: string | null;
  errorCode: number | null;
}> {
  const existing = await getUserByEmail(data.email);
  if (existing) return { error: 'Email already registered', errorCode: 409 };

  const userId = uuid();
  const passwordHash = await bcrypt.hash(data.password, 12);
  const now = new Date();

  await createUser({
    id: userId,
    email: data.email.toLowerCase(),
    password_hash: passwordHash,
    name: data.name,
    role: data.role as UserRole,
    created_at: now,
    updated_at: now,
  });
  return { error: null, errorCode: null };
}

export async function signout(data: SignOutRequest): Promise<void> {
  const { token } = data;
  await revokeToken(token);
}
