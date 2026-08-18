import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getUserByUsername, hasAnyUser } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'hub-secret-key-super-secure-change-in-prod-1234567890!'
);

const COOKIE_NAME = 'hub_session';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(username: string): Promise<string> {
  const token = await new SignJWT({ username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);

  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return token;
}

export async function verifySession(): Promise<{ authenticated: boolean; username?: string }> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return { authenticated: false };
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const username = payload.username as string;

    if (!username) {
      return { authenticated: false };
    }

    const user = await getUserByUsernameAsync(username);
    if (!user) {
      return { authenticated: false };
    }

    return { authenticated: true, username: user.username };
  } catch (error) {
    return { authenticated: false };
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isSetupCompleted(): Promise<boolean> {
  return hasAnyUserAsync();
}
