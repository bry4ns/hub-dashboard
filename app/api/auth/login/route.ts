import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsernameAsync, createUserAsync } from '@/lib/db';
import { comparePassword, createSession, hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña requeridos.' },
        { status: 400 }
      );
    }

    const trimmedUser = username.trim();
    const envAdminUser = process.env.ADMIN_USERNAME?.trim();
    const envAdminPass = process.env.ADMIN_PASSWORD;

    // 1. Check if matches ADMIN_USERNAME and ADMIN_PASSWORD from .env
    if (
      envAdminUser &&
      envAdminPass &&
      trimmedUser.toLowerCase() === envAdminUser.toLowerCase() &&
      password === envAdminPass
    ) {
      // Auto-provision in database if not already present
      const existingUser = await getUserByUsernameAsync(envAdminUser);
      if (!existingUser) {
        const hash = await hashPassword(envAdminPass);
        await createUserAsync(envAdminUser, hash);
      }

      await createSession(envAdminUser);
      return NextResponse.json({
        success: true,
        user: { username: envAdminUser },
      });
    }

    // 2. Check Database users
    const user = await getUserByUsernameAsync(trimmedUser);
    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas.' },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Credenciales inválidas.' },
        { status: 401 }
      );
    }

    await createSession(user.username);

    return NextResponse.json({
      success: true,
      user: { username: user.username },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
