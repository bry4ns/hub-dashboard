import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getDatabase, saveDatabase } from '@/lib/db';

export async function GET() {
  const session = await verifySession();
  if (!session.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const db = getDatabase();
  // omit password hashes for export security
  const exportData = {
    ...db,
    users: db.users.map((u) => ({ id: u.id, username: u.username, createdAt: u.createdAt })),
    exportedAt: new Date().toISOString(),
  };

  return NextResponse.json(exportData);
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const importData = await req.json();
    const currentDb = getDatabase();

    if (Array.isArray(importData.cards)) {
      currentDb.cards = importData.cards;
    }
    if (Array.isArray(importData.categories)) {
      currentDb.categories = importData.categories;
    }
    if (importData.settings) {
      currentDb.settings = { ...currentDb.settings, ...importData.settings };
    }

    saveDatabase(currentDb);

    return NextResponse.json({
      success: true,
      message: 'Datos restaurados correctamente',
      cardsCount: currentDb.cards.length,
      categoriesCount: currentDb.categories.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al importar datos' },
      { status: 500 }
    );
  }
}
