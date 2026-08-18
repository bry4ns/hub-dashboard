import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { scrapeUrlMetadata } from '@/lib/scraper';

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
    }

    const metadata = await scrapeUrlMetadata(url);
    return NextResponse.json({ success: true, metadata });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al analizar la URL' },
      { status: 500 }
    );
  }
}
