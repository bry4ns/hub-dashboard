import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername } from '@/lib/db';
import { comparePassword, createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña requeridos.' },
        { status: 400 }
      );
    }

    const user = await getUserByUsernameAsync(username.trim());
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
