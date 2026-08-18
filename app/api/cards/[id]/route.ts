import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { saveCardAsync, deleteCardAsync } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await verifySession();
  if (!session.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const id = params.id;
    const body = await req.json();

    const updated = await saveCardAsync({
      id,
      title: body.title ? body.title.trim() : 'Sin título',
      url: body.url?.trim() || '#',
      description: body.description?.trim() || '',
      category: body.category || 'cat-general',
      cardSize: body.cardSize || 'normal',
      cardType: body.cardType || 'app',
      serverConfig: body.serverConfig || undefined,
      layout: body.layout !== undefined ? body.layout : undefined,
      iconUrl: body.iconUrl?.trim() || '',
      imageUrl: body.imageUrl?.trim() || '',
      accentColor: body.accentColor || '#38bdf8',
      isPinned: Boolean(body.isPinned),
      checkStatus: Boolean(body.checkStatus),
      healthEndpoint: body.healthEndpoint?.trim() || '',
      order: body.order ?? 0,
    });

    return NextResponse.json({ success: true, card: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al actualizar la tarjeta' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await verifySession();
  if (!session.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const success = await deleteCardAsync(params.id);
  if (!success) {
    return NextResponse.json({ error: 'Tarjeta no encontrada' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
