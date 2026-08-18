import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { checkUrlStatus } from '@/lib/status-checker';
import { updateCardStatus, getCards } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { cardId, url, healthEndpoint } = await req.json();

    if (!url && !cardId) {
      return NextResponse.json({ error: 'URL o ID de tarjeta requeridos' }, { status: 400 });
    }

    let targetUrl = url;
    if (cardId) {
      const cards = getCards();
      const card = cards.find((c) => c.id === cardId);
      if (card) {
        targetUrl = card.healthEndpoint || card.url;
      }
    } else if (healthEndpoint) {
      targetUrl = healthEndpoint;
    }

    if (!targetUrl) {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    const statusResult = await checkUrlStatus(targetUrl);

    if (cardId) {
      updateCardStatus(cardId, statusResult);
    }

    return NextResponse.json({ success: true, status: statusResult });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al comprobar estado' },
      { status: 500 }
    );
  }
}
