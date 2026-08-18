import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getCards, updateCardStatus } from '@/lib/db';
import { checkUrlStatus } from '@/lib/status-checker';

export async function POST() {
  const session = await verifySession();
  if (!session.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const cards = getCards();
  const monitorableCards = cards.filter((c) => c.checkStatus);

  const results: Record<string, any> = {};

  // Check up to 10 concurrently
  const checkPromises = monitorableCards.map(async (card) => {
    const targetUrl = card.healthEndpoint || card.url;
    const res = await checkUrlStatus(targetUrl);
    updateCardStatus(card.id, res);
    results[card.id] = res;
  });

  await Promise.allSettled(checkPromises);

  return NextResponse.json({
    success: true,
    totalChecked: monitorableCards.length,
    statuses: results,
  });
}
