import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getCards, saveCard, saveCategory, getCategories } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { hubUrl, username, password, token, categoryId } = await req.json();

    if (!hubUrl) {
      return NextResponse.json({ error: 'URL del Beszel Hub requerida' }, { status: 400 });
    }

    // 1. Fetch systems from Beszel Hub
    const beszelRes = await fetch(new URL('/api/beszel', req.url).href, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: req.headers.get('cookie') || '',
      },
      body: JSON.stringify({ hubUrl, username, password, token }),
    });

    const beszelData = await beszelRes.json();
    if (!beszelRes.ok || !beszelData.systems) {
      return NextResponse.json(
        { error: beszelData.error || 'No se pudieron obtener los servidores de Beszel' },
        { status: 400 }
      );
    }

    // 2. Ensure "Servidores Beszel" category exists if not provided
    let targetCatId = categoryId;
    if (!targetCatId) {
      const categories = getCategories();
      const existing = categories.find((c) => c.name.toLowerCase().includes('beszel') || c.name.toLowerCase().includes('servidor'));
      if (existing) {
        targetCatId = existing.id;
      } else {
        const newCat = saveCategory({
          name: 'Servidores & Beszel',
          color: '#818cf8',
          order: 1,
        });
        targetCatId = newCat.id;
      }
    }

    const currentCards = getCards();
    const cleanHubUrl = hubUrl.trim().replace(/\/+$/, '');
    let createdCount = 0;
    let updatedCount = 0;

    for (const sys of beszelData.systems) {
      const existingCard = currentCards.find(
        (c) =>
          c.cardType === 'beszel' &&
          (c.serverConfig?.systemId === sys.id || c.title.toLowerCase() === sys.name.toLowerCase())
      );

      const memTotalBytes = sys.info?.memory || 0;
      const memUsedBytes = sys.stats?.mp ? (memTotalBytes * (sys.stats.mp / 100)) : 0;

      const cardPayload = {
        id: existingCard?.id,
        title: sys.name,
        url: `${cleanHubUrl}/system/${encodeURIComponent(sys.name)}`,
        description: `CPU: ${sys.info?.cores || 1} Cores | ${sys.info?.cpu || 'Beszel Node'}`,
        category: targetCatId,
        cardSize: existingCard?.cardSize || 'wide',
        cardType: 'beszel' as const,
        serverConfig: {
          serverType: 'beszel' as const,
          endpoint: cleanHubUrl,
          systemId: sys.id,
          token: beszelData.token || token,
          cachedMetrics: {
            cpuPercent: Math.round(sys.stats?.cpu || 0),
            ramTotalBytes: memTotalBytes,
            ramUsedBytes: memUsedBytes,
            ramPercent: Math.round(sys.stats?.mp || 0),
            diskPercent: Math.round(sys.stats?.dp || 0),
            hostname: sys.name,
            osPlatform: sys.info?.os || 'Linux / Docker',
            lastUpdated: new Date().toISOString(),
          },
        },
        accentColor: '#818cf8',
        isPinned: existingCard?.isPinned ?? false,
        checkStatus: true,
        healthEndpoint: `${cleanHubUrl}/api/collections/systems/records/${sys.id}`,
        order: existingCard?.order ?? 999,
      };

      saveCard(cardPayload);
      if (existingCard) {
        updatedCount++;
      } else {
        createdCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sincronización completada con Beszel Hub: ${createdCount} nuevos, ${updatedCount} actualizados.`,
      totalSynced: beszelData.systems.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al sincronizar con Beszel' },
      { status: 500 }
    );
  }
}
