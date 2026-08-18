import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getCategoriesAsync, saveCategoryAsync, deleteCategoryAsync } from '@/lib/db';

export async function GET() {
  const session = await verifySession();
  if (!session.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const categories = await getCategoriesAsync();
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { name, icon, color, id } = await req.json();
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'El nombre de la categoría es obligatorio' }, { status: 400 });
    }

    const cat = await saveCategoryAsync({
      id,
      name: name.trim(),
      icon: icon?.trim() || '',
      color: color || '#38bdf8',
      order: 99,
    });

    return NextResponse.json({ success: true, category: cat });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al guardar categoría' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await verifySession();
  if (!session.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ID de categoría requerido' }, { status: 400 });
  }

  const success = await deleteCategoryAsync(id);
  return NextResponse.json({ success });
}
