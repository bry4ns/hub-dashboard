import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

export interface BeszelSystem {
  id: string;
  name: string;
  host: string;
  port: string;
  status: 'up' | 'down' | 'paused';
  updated: string;
  info?: {
    cpu?: string;
    cores?: number;
    threads?: number;
    memory?: number; // Total bytes or GB
    disk?: number;
    os?: string;
    kernel?: string;
    uptime?: number;
  };
  stats?: {
    cpu?: number;
    mp?: number; // memory percent
    dp?: number; // disk percent
    net?: number;
    bandwidth?: number;
    temperatures?: Record<string, number>;
    docker?: number; // active containers
    extra?: any;
  };
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { hubUrl, username, password, token, action, systemId } = await req.json();

    if (!hubUrl) {
      return NextResponse.json({ error: 'URL del Beszel Hub requerida' }, { status: 400 });
    }

    let cleanHubUrl = hubUrl.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(cleanHubUrl)) {
      cleanHubUrl = 'http://' + cleanHubUrl;
    }

    let authToken = token?.trim();

    // 1. Authenticate if username and password are provided
    if (username && password && !authToken) {
      try {
        const authRes = await fetch(`${cleanHubUrl}/api/collections/users/auth-with-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identity: username.trim(),
            password: password,
          }),
        });

        if (authRes.ok) {
          const authData = await authRes.json();
          authToken = authData.token;
        }
      } catch (authErr) {
        console.warn('Beszel auth-with-password failed, trying public access:', authErr);
      }
    }

    const headers: Record<string, string> = {
      'User-Agent': 'HubDashboard-Beszel/1.0',
    };
    if (authToken) {
      headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : authToken;
    }

    // 2. Fetch Systems List from PocketBase/Beszel API
    const systemsRes = await fetch(`${cleanHubUrl}/api/collections/systems/records?perPage=100`, {
      headers,
    });

    if (!systemsRes.ok) {
      // If collection is not accessible or standard endpoint differs, try public stats
      return NextResponse.json(
        {
          error: `Error al conectar con Beszel Hub (${systemsRes.status}: ${systemsRes.statusText}). Verifica la URL o credenciales.`,
        },
        { status: systemsRes.status }
      );
    }

    const systemsData = await systemsRes.json();
    const items = systemsData.items || [];

    const formattedSystems: BeszelSystem[] = items.map((item: any) => {
      // Parse info & stats JSON if stringified
      let parsedInfo = item.info;
      if (typeof parsedInfo === 'string') {
        try { parsedInfo = JSON.parse(parsedInfo); } catch (e) {}
      }

      let parsedStats = item.stats;
      if (typeof parsedStats === 'string') {
        try { parsedStats = JSON.parse(parsedStats); } catch (e) {}
      }

      return {
        id: item.id,
        name: item.name || item.host || 'Servidor Beszel',
        host: item.host,
        port: item.port,
        status: item.status || 'up',
        updated: item.updated || item.created,
        info: parsedInfo || {},
        stats: parsedStats || {},
      };
    });

    // If requesting specific system
    if (systemId) {
      const found = formattedSystems.find((s) => s.id === systemId);
      return NextResponse.json({
        success: true,
        token: authToken,
        system: found || null,
      });
    }

    return NextResponse.json({
      success: true,
      token: authToken,
      systems: formattedSystems,
      total: formattedSystems.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al comunicar con Beszel Hub' },
      { status: 500 }
    );
  }
}
