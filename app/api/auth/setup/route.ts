import { NextRequest, NextResponse } from 'next/server';
import { isSetupCompleted, hashPassword, createSession } from '@/lib/auth';
import { createUser } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const setupDone = await isSetupCompleted();
    if (setupDone) {
      return NextResponse.json(
        { error: 'El sistema ya ha sido inicializado.' },
        { status: 400 }
      );
    }

    const { username, password } = await req.json();

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json(
        { error: 'El nombre de usuario debe tener al menos 3 caracteres.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUserAsync(username.trim(), passwordHash);
    await createSession(user.username);

    return NextResponse.json({
      success: true,
      message: 'Administrador configurado correctamente',
      user: { username: user.username },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
