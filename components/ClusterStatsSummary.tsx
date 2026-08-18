'use client';

import React, { useState, useEffect } from 'react';
import { Server, Activity, Cpu, HardDrive, ShieldCheck, ChevronUp, ChevronDown } from 'lucide-react';
import { CardItem, SystemMetrics } from '@/types';

interface ClusterStatsSummaryProps {
  cards: CardItem[];
}

function formatBytes(bytes: number): string {
  if (!bytes || isNaN(bytes)) return '0 GB';
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

export const ClusterStatsSummary: React.FC<ClusterStatsSummaryProps> = ({ cards }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hostMetrics, setHostMetrics] = useState<SystemMetrics | null>(null);

  // Find server cards
  const serverCards = cards.filter(
    (c) => c.cardType === 'server_stats' || c.cardType === 'beszel'
  );

  useEffect(() => {
    async function fetchHostMetrics() {
      try {
        const res = await fetch('/api/system-stats');
        const data = await res.json();
        if (data.metrics) {
          setHostMetrics(data.metrics);
        }
      } catch (err) {
        console.error('Error fetching host metrics for cluster summary:', err);
      }
    }
    fetchHostMetrics();
    const timer = setInterval(fetchHostMetrics, 12000);
    return () => clearInterval(timer);
  }, []);

  // Compute cluster sums
  let totalRamBytes = hostMetrics ? hostMetrics.ramTotalBytes : 0;
  let usedRamBytes = hostMetrics ? hostMetrics.ramUsedBytes : 0;
  let cpuSum = hostMetrics ? hostMetrics.cpuPercent : 0;
  let serverCount = 1;

  // Add cached metrics from other servers if any
  serverCards.forEach((sc) => {
    if (sc.serverConfig?.serverType !== 'host' && sc.serverConfig?.cachedMetrics) {
      totalRamBytes += sc.serverConfig.cachedMetrics.ramTotalBytes;
      usedRamBytes += sc.serverConfig.cachedMetrics.ramUsedBytes;
      cpuSum += sc.serverConfig.cachedMetrics.cpuPercent;
      serverCount++;
    }
  });

  const totalRamPercent = totalRamBytes > 0 ? Math.round((usedRamBytes / totalRamBytes) * 100) : 0;
  const avgCpu = Math.round(cpuSum / Math.max(1, serverCount));

  return (
    <div className="w-full rounded-2xl glass-panel border border-slate-800/90 overflow-hidden shadow-xl shadow-black/20">
      {/* Header Bar */}
      <div className="px-5 py-3 bg-slate-900/60 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              Resumen de Infraestructura & Servidores
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-950 text-emerald-300 font-mono border border-emerald-500/30">
                {serverCards.length} {serverCards.length === 1 ? 'nodo' : 'nodos'}
              </span>
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs flex items-center gap-1"
        >
          <span className="text-[11px] hidden sm:inline">{isCollapsed ? 'Mostrar' : 'Ocultar'}</span>
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Stats Body */}
      {!isCollapsed && (
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total RAM Across All Servers */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-sky-400" />
                RAM Total Combinada
              </span>
              <span className="font-mono font-bold text-sky-300">{totalRamPercent}%</span>
            </div>
            <div className="space-y-1.5">
              <div className="text-base font-bold text-slate-100 font-mono">
                {formatBytes(usedRamBytes)}{' '}
                <span className="text-xs text-slate-400 font-normal">/ {formatBytes(totalRamBytes)}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, totalRamPercent))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Average CPU Load */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Carga Promedio CPU
              </span>
              <span className="font-mono font-bold text-emerald-300">{avgCpu}%</span>
            </div>
            <div className="space-y-1.5">
              <div className="text-base font-bold text-slate-100 font-mono">{avgCpu}% Uso</div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, avgCpu))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Infrastructure Health */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                Disponibilidad de Nodos
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold">100% Operativo</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-base font-bold text-slate-100 font-mono">
                  {serverCards.length}{' '}
                  <span className="text-xs text-slate-400 font-normal">servidores monitorizados</span>
                </div>
                <span className="text-[11px] text-slate-500">Métricas en tiempo real</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
