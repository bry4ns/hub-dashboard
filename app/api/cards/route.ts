import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getCardsAsync, saveCardAsync, getCategoriesAsync, getSettingsAsync } from '@/lib/db';

export async function GET() {
  const session = await verifySession();
  if (!session.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const cards = await getCardsAsync();
  const categories = await getCategoriesAsync();
  const settings = await getSettingsAsync();

  return NextResponse.json({ cards, categories, settings });
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body.title) {
      return NextResponse.json(
        { error: 'El título es obligatorio' },
        { status: 400 }
      );
    }

    const card = await saveCardAsync({
      title: body.title.trim(),
      url: body.url?.trim() || '#',
      description: body.description?.trim() || '',
      category: body.category || 'cat-general',
      cardSize: body.cardSize || 'normal',
      cardType: body.cardType || 'app',
      serverConfig: body.serverConfig || undefined,
      layout: body.layout || undefined,
      iconUrl: body.iconUrl?.trim() || '',
      imageUrl: body.imageUrl?.trim() || '',
      accentColor: body.accentColor || '#38bdf8',
      isPinned: Boolean(body.isPinned),
      checkStatus: Boolean(body.checkStatus),
      healthEndpoint: body.healthEndpoint?.trim() || '',
      order: body.order ?? 999,
    });

    return NextResponse.json({ success: true, card });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al guardar la tarjeta' },
      { status: 500 }
    );
  }
}
