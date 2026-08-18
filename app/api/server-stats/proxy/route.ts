import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { SystemMetrics } from '@/types';

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { endpoint, serverType, token } = await req.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint requerido' }, { status: 400 });
    }

    const headers: Record<string, string> = {
      'User-Agent': 'HubServerMonitor/1.0',
    };
    if (token) {
      headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(endpoint, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Error ${response.status}: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    let metrics: Partial<SystemMetrics> = {
      lastUpdated: new Date().toISOString(),
    };

    // Parser for Beszel / Glances / Custom JSON
    if (serverType === 'beszel') {
      // Beszel hub or agent format
      const cpu = data.cpu ?? data.stats?.cpu ?? 0;
      const memUsed = data.mem_used ?? data.stats?.mem_used ?? data.ramUsed ?? 0;
      const memTotal = data.mem_total ?? data.stats?.mem_total ?? data.ramTotal ?? 1;
      const diskUsed = data.disk_used ?? data.stats?.disk_used;
      const diskTotal = data.disk_total ?? data.stats?.disk_total;

      metrics = {
        cpuPercent: Math.round(Number(cpu)),
        ramUsedBytes: Number(memUsed) * (memUsed < 100000 ? 1024 * 1024 * 1024 : 1), // detect GB vs Bytes
        ramTotalBytes: Number(memTotal) * (memTotal < 100000 ? 1024 * 1024 * 1024 : 1),
        ramPercent: Math.round((Number(memUsed) / (Number(memTotal) || 1)) * 100),
        diskUsedBytes: diskUsed ? Number(diskUsed) * 1024 * 1024 * 1024 : undefined,
        diskTotalBytes: diskTotal ? Number(diskTotal) * 1024 * 1024 * 1024 : undefined,
        diskPercent: diskUsed && diskTotal ? Math.round((Number(diskUsed) / Number(diskTotal)) * 100) : undefined,
        hostname: data.name || data.hostname,
        lastUpdated: new Date().toISOString(),
      };
    } else if (serverType === 'glances') {
      // Glances REST API format
      const cpuPercent = data.cpu?.total ?? data.quicklook?.cpu ?? 0;
      const memUsed = data.mem?.used ?? 0;
      const memTotal = data.mem?.total ?? 1;
      metrics = {
        cpuPercent: Math.round(Number(cpuPercent)),
        ramUsedBytes: Number(memUsed),
        ramTotalBytes: Number(memTotal),
        ramPercent: Math.round((Number(memUsed) / Number(memTotal)) * 100),
        hostname: data.system?.hostname,
        lastUpdated: new Date().toISOString(),
      };
    } else {
      // Generic Custom JSON format
      const cpuPercent = data.cpuPercent ?? data.cpu ?? data.cpu_usage ?? 0;
      const ramUsed = data.ramUsedBytes ?? data.ramUsed ?? data.mem_used ?? 0;
      const ramTotal = data.ramTotalBytes ?? data.ramTotal ?? data.mem_total ?? 1;
      const ramPercent = data.ramPercent ?? Math.round((Number(ramUsed) / Number(ramTotal)) * 100);

      metrics = {
        cpuPercent: Math.round(Number(cpuPercent)),
        ramUsedBytes: Number(ramUsed),
        ramTotalBytes: Number(ramTotal),
        ramPercent: Math.round(Number(ramPercent)),
        diskPercent: data.diskPercent ?? data.disk_usage,
        uptimeSeconds: data.uptime ?? data.uptimeSeconds,
        hostname: data.hostname || data.name,
        lastUpdated: new Date().toISOString(),
      };
    }

    return NextResponse.json({ success: true, metrics });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al conectar con el servidor de métricas' },
      { status: 500 }
    );
  }
}
