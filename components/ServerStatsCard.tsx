'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Cpu,
  HardDrive,
  Activity,
  MoreVertical,
  Pin,
  Edit2,
  Trash2,
  RefreshCw,
  Clock,
  ExternalLink,
  Maximize2,
  Minimize2,
  Container,
  Thermometer,
  Zap,
} from 'lucide-react';
import { CardItem, Category, SystemMetrics } from '@/types';
import { StatusBadge } from './StatusBadge';

interface ServerStatsCardProps {
  card: CardItem;
  categories: Category[];
  onEdit: (card: CardItem) => void;
  onDelete: (id: string) => void;
  onTogglePin: (card: CardItem) => void;
  onToggleSize: (card: CardItem) => void;
  onRefreshStatus: (id: string) => Promise<void>;
  openInNewTab?: boolean;
}

function formatBytes(bytes?: number): string {
  if (!bytes || isNaN(bytes) || bytes === 0) return 'N/A';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb < 1) {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  }
  return `${gb.toFixed(1)} GB`;
}

function formatUptime(seconds?: number): string {
  if (!seconds) return '0h';
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export const ServerStatsCard: React.FC<ServerStatsCardProps> = ({
  card,
  categories,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleSize,
  onRefreshStatus,
  openInNewTab = true,
}) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(
    card.serverConfig?.cachedMetrics || null
  );
  const [beszelExtra, setBeszelExtra] = useState<{
    status?: string;
    temperature?: number;
    dockerContainers?: number;
    diskPercent?: number;
  } | null>(null);

  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const category = categories.find((c) => c.id === card.category);
  const isWide = card.cardSize === 'wide' || card.cardSize === 'large';
  const isLarge = card.cardSize === 'large';
  const isBeszel = card.cardType === 'beszel' || card.serverConfig?.serverType === 'beszel';

  // Fetch Server / Beszel Metrics
  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoadingMetrics(true);

      if (isBeszel && card.serverConfig?.endpoint && card.serverConfig?.systemId) {
        // Query Beszel API specifically
        const res = await fetch('/api/beszel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hubUrl: card.serverConfig.endpoint,
            systemId: card.serverConfig.systemId,
            token: card.serverConfig.token,
          }),
        });

        const data = await res.json();
        if (data.system) {
          const sys = data.system;
          const memTotalBytes = sys.info?.memory || 0;
          const memUsedBytes = sys.stats?.mp ? (memTotalBytes * (sys.stats.mp / 100)) : 0;

          setMetrics({
            cpuPercent: Math.round(sys.stats?.cpu || 0),
            ramTotalBytes: memTotalBytes,
            ramUsedBytes: memUsedBytes,
            ramPercent: Math.round(sys.stats?.mp || 0),
            diskPercent: Math.round(sys.stats?.dp || 0),
            hostname: sys.name,
            osPlatform: sys.info?.os || 'Linux / Docker',
            lastUpdated: new Date().toISOString(),
          });

          // Extract temperature if available in Beszel stats
          let temp: number | undefined;
          if (sys.stats?.temperatures) {
            const tempVals = Object.values(sys.stats.temperatures) as number[];
            if (tempVals.length > 0) temp = Math.round(tempVals[0]);
          }

          setBeszelExtra({
            status: sys.status,
            temperature: temp,
            dockerContainers: sys.stats?.docker,
            diskPercent: sys.stats?.dp ? Math.round(sys.stats.dp) : undefined,
          });
          return;
        }
      }

      // Host Local Server Stats
      const isHost = card.serverConfig?.serverType === 'host' || !card.serverConfig?.serverType;
      let res: Response;

      if (isHost) {
        res = await fetch('/api/system-stats');
      } else {
        res = await fetch('/api/server-stats/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: card.serverConfig?.endpoint || card.url,
            serverType: card.serverConfig?.serverType,
            token: card.serverConfig?.token,
          }),
        });
      }

      const data = await res.json();
      if (data.metrics) {
        setMetrics(data.metrics);
        if (data.metrics.diskPercent) {
          setBeszelExtra((prev) => ({ ...prev, diskPercent: data.metrics.diskPercent }));
        }
      }
    } catch (err) {
      console.error('Error fetching server metrics:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [card, isBeszel]);

  // Initial load and periodic refresh
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  // Click outside menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.menu-container')) {
      return;
    }
    if (card.url && card.url !== '#') {
      window.open(card.url, openInNewTab ? '_blank' : '_self', 'noopener,noreferrer');
    }
  };

  // Color helpers
  const getProgressColor = (percent: number) => {
    if (percent >= 85) return 'bg-rose-500';
    if (percent >= 70) return 'bg-amber-500';
    return isBeszel ? 'bg-indigo-500' : 'bg-emerald-500';
  };

  const getTextColor = (percent: number) => {
    if (percent >= 85) return 'text-rose-400';
    if (percent >= 70) return 'text-amber-400';
    return isBeszel ? 'text-indigo-400' : 'text-emerald-400';
  };

  const isServerUp = beszelExtra?.status ? beszelExtra.status === 'up' : true;

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex flex-col justify-between rounded-2xl glass-panel glass-panel-hover overflow-hidden cursor-pointer transition-all duration-300 border border-slate-850 hover:shadow-2xl ${
        isBeszel
          ? 'hover:border-indigo-500/50 hover:shadow-indigo-950/25'
          : 'hover:border-emerald-500/50 hover:shadow-emerald-950/20'
      } ${
        isLarge ? 'col-span-1 sm:col-span-2 row-span-2' : isWide ? 'col-span-1 sm:col-span-2' : 'col-span-1'
      } ${card.isPinned ? 'ring-1 ring-indigo-500/40' : ''}`}
      style={{
        borderTop: `3px solid ${card.accentColor || (isBeszel ? '#818cf8' : '#10b981')}`,
      }}
    >
      <div className="p-5 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl p-2 flex items-center justify-center flex-shrink-0 shadow-inner transition-colors ${
                isBeszel
                  ? 'bg-indigo-950/70 border border-indigo-500/40 group-hover:border-indigo-400 text-indigo-400'
                  : 'bg-emerald-950/70 border border-emerald-500/30 group-hover:border-emerald-400 text-emerald-400'
              }`}
            >
              {isBeszel ? <Zap className="w-5 h-5" /> : <Server className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className={`font-bold text-slate-100 transition-colors line-clamp-1 text-base ${
                    isBeszel ? 'group-hover:text-indigo-300' : 'group-hover:text-emerald-300'
                  }`}
                >
                  {card.title}
                </h3>
                {card.isPinned && (
                  <Pin
                    className={`w-3.5 h-3.5 rotate-45 flex-shrink-0 ${
                      isBeszel ? 'text-indigo-400 fill-indigo-400' : 'text-emerald-400 fill-emerald-400'
                    }`}
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 block truncate max-w-[170px] font-mono">
                  {metrics?.hostname || card.url.replace(/^https?:\/\//, '') || 'Servidor'}
                </span>
                {beszelExtra?.status && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                      beszelExtra.status === 'up'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {beszelExtra.status}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="relative menu-container flex items-center gap-1" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSize(card);
              }}
              title={isWide ? 'Reducir tamaño' : 'Agrandar tarjeta'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all opacity-0 group-hover:opacity-100"
            >
              {isWide ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fetchMetrics();
              }}
              title="Actualizar métricas ahora"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isLoadingMetrics ? 'animate-spin ' + (isBeszel ? 'text-indigo-400' : 'text-emerald-400') : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 top-8 z-30 w-44 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl py-1.5 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onEdit(card);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onTogglePin(card);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors"
                >
                  <Pin className="w-3.5 h-3.5 text-slate-400" />
                  {card.isPinned ? 'Desfijar' : 'Fijar favorito'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onDelete(card.id);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-600/20 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Metrics */}
        {metrics ? (
          <div className="space-y-3.5 my-2">
            {/* RAM Meter */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  Memoria RAM
                </span>
                <span className={`font-mono font-bold ${getTextColor(metrics.ramPercent)}`}>
                  {metrics.ramPercent}%{' '}
                  {metrics.ramTotalBytes > 0 && (
                    <span className="text-slate-400 text-[11px] font-normal">
                      ({formatBytes(metrics.ramUsedBytes)} / {formatBytes(metrics.ramTotalBytes)})
                    </span>
                  )}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                    metrics.ramPercent
                  )}`}
                  style={{ width: `${Math.min(100, Math.max(0, metrics.ramPercent))}%` }}
                />
              </div>
            </div>

            {/* CPU Meter */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  Carga CPU
                </span>
                <span className={`font-mono font-bold ${getTextColor(metrics.cpuPercent)}`}>
                  {metrics.cpuPercent}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                    metrics.cpuPercent
                  )}`}
                  style={{ width: `${Math.min(100, Math.max(0, metrics.cpuPercent))}%` }}
                />
              </div>
            </div>

            {/* Disk Meter (if available) */}
            {beszelExtra?.diskPercent !== undefined && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                    Uso de Disco
                  </span>
                  <span className="font-mono font-bold text-slate-300">{beszelExtra.diskPercent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, beszelExtra.diskPercent))}%` }}
                  />
                </div>
              </div>
            )}

            {/* Extra Info Grid (Containers, Temp, Uptime) */}
            {(isWide || isLarge) && (
              <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-800/80 text-xs">
                {beszelExtra?.temperature !== undefined ? (
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Thermometer className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 block">Temp</span>
                      <span className="font-mono font-semibold">{beszelExtra.temperature}°C</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 block">Uptime</span>
                      <span className="font-mono font-semibold">
                        {formatUptime(metrics.uptimeSeconds || 3600 * 24)}
                      </span>
                    </div>
                  </div>
                )}

                {beszelExtra?.dockerContainers !== undefined ? (
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Container className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 block">Docker</span>
                      <span className="font-mono font-semibold">
                        {beszelExtra.dockerContainers} containers
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Activity className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 block">Estado</span>
                      <span className="font-mono font-semibold text-emerald-400">Activo</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-slate-300 truncate">
                  <Server className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] text-slate-500 block">OS</span>
                    <span className="font-mono font-semibold truncate block">
                      {metrics.osPlatform || 'Linux'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 flex items-center justify-center text-xs text-slate-400 gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Conectando con Beszel / Servidor...</span>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 truncate">
            {category && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50 font-medium text-[11px]">
                {category.name}
              </span>
            )}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                isBeszel
                  ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/40'
                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/30'
              }`}
            >
              {isBeszel ? 'BESZEL' : 'HOST'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {card.checkStatus && <StatusBadge card={card} onRefresh={onRefreshStatus} />}
            {card.url && card.url !== '#' && (
              <div className="p-1 rounded text-slate-500 group-hover:text-indigo-400 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
