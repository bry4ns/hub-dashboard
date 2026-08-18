import { NextResponse } from 'next/server';
import os from 'os';
import { verifySession } from '@/lib/auth';
import { SystemMetrics } from '@/types';

// Helper to calculate CPU usage over a short sampling interval
function getCpuUsage(): Promise<number> {
  return new Promise((resolve) => {
    const cpus1 = os.cpus();
    setTimeout(() => {
      const cpus2 = os.cpus();
      let idleDiff = 0;
      let totalDiff = 0;

      for (let i = 0; i < cpus1.length; i++) {
        const c1 = cpus1[i].times;
        const c2 = cpus2[i].times;

        const idle1 = c1.idle;
        const idle2 = c2.idle;

        const total1 = c1.user + c1.nice + c1.sys + c1.irq + c1.idle;
        const total2 = c2.user + c2.nice + c2.sys + c2.irq + c2.idle;

        idleDiff += idle2 - idle1;
        totalDiff += total2 - total1;
      }

      if (totalDiff <= 0) {
        resolve(0);
      } else {
        const usage = 100 - (100 * idleDiff) / totalDiff;
        resolve(Math.round(Math.max(0, Math.min(100, usage))));
      }
    }, 150);
  });
}

export async function GET() {
  const session = await verifySession();
  if (!session.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramPercent = Math.round((usedMem / totalMem) * 100);

    const cpuPercent = await getCpuUsage();

    const metrics: SystemMetrics = {
      cpuPercent,
      ramTotalBytes: totalMem,
      ramUsedBytes: usedMem,
      ramPercent,
      uptimeSeconds: Math.floor(os.uptime()),
      hostname: os.hostname(),
      osPlatform: `${os.type()} (${os.arch()})`,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, metrics });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al obtener métricas del sistema' },
      { status: 500 }
    );
  }
}
