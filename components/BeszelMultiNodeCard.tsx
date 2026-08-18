'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Cpu,
  Activity,
  Zap,
  MoreVertical,
  Pin,
  Edit2,
  Trash2,
  RefreshCw,
  ExternalLink,
  Maximize2,
  Minimize2,
  Thermometer,
  Container,
  HardDrive,
  Grid,
} from 'lucide-react';
import { CardItem, Category, BeszelDesign } from '@/types';
import { StatusBadge } from './StatusBadge';

interface BeszelMultiNodeCardProps {
  card: CardItem;
  categories: Category[];
  onEdit: (card: CardItem) => void;
  onDelete: (id: string) => void;
  onTogglePin: (card: CardItem) => void;
  onToggleSize?: (card: CardItem) => void;
  onRefreshStatus: (id: string) => Promise<void>;
  openInNewTab?: boolean;
}

function formatBytes(bytes?: number): string {
  if (!bytes || isNaN(bytes) || bytes === 0) return '0 GB';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb < 1) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${gb.toFixed(1)} GB`;
}

export const BeszelMultiNodeCard: React.FC<BeszelMultiNodeCardProps> = ({
  card,
  categories,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleSize,
  onRefreshStatus,
  openInNewTab = true,
}) => {
  const [systems, setSystems] = useState<any[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const hubUrl = card.serverConfig?.endpoint || 'http://localhost:8090';

  // Fetch all systems from Beszel Hub
  const fetchAllSystems = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/beszel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hubUrl,
          token: card.serverConfig?.token,
        }),
      });
      const data = await res.json();
      if (data.systems && Array.isArray(data.systems)) {
        setSystems(data.systems);
      }
    } catch (err) {
      console.error('Error fetching all Beszel systems:', err);
    } finally {
      setIsLoading(false);
    }
  }, [hubUrl, card.serverConfig?.token]);

  useEffect(() => {
    fetchAllSystems();
    const timer = setInterval(fetchAllSystems, 10000);
    return () => clearInterval(timer);
  }, [fetchAllSystems]);

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

  const activeSystems = selectedSystemId === 'all'
    ? systems
    : systems.filter((s) => s.id === selectedSystemId);

  const category = categories.find((c) => c.id === card.category);

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl glass-panel glass-panel-hover overflow-hidden transition-all duration-300 border border-slate-800 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-950/20 col-span-1 sm:col-span-2 lg:col-span-2 row-span-2 ${
        card.isPinned ? 'ring-1 ring-indigo-500/40' : ''
      }`}
      style={{
        borderTop: `3px solid ${card.accentColor || '#818cf8'}`,
      }}
    >
      <div className="p-5 flex-1 flex flex-col">
        {/* Header with Server Switcher Tabs */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/70 border border-indigo-500/40 p-2 flex items-center justify-center flex-shrink-0 text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 group-hover:text-indigo-300 transition-colors text-base">
                  {card.title}
                </h3>
                {card.isPinned && (
                  <Pin className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400 rotate-45 flex-shrink-0" />
                )}
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {systems.length > 0 ? `${systems.length} servidores en Beszel` : 'Beszel Hub'}
              </span>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="relative menu-container flex items-center gap-1" ref={menuRef}>
            <button
              type="button"
              onClick={fetchAllSystems}
              title="Actualizar todos los servidores"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 z-30 w-44 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl py-1.5 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(card);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onTogglePin(card);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                >
                  <Pin className="w-3.5 h-3.5 text-slate-400" />
                  {card.isPinned ? 'Desfijar' : 'Fijar favorito'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(card.id);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-600/20 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Server Selector Tab Pills */}
        {systems.length > 0 && (
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedSystemId('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                selectedSystemId === 'all'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3 h-3" />
              <span>Todos ({systems.length})</span>
            </button>

            {systems.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSystemId(s.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all truncate max-w-[130px] ${
                  selectedSystemId === s.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    s.status === 'up' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className="truncate">{s.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Node Grid Content */}
        {activeSystems.length > 0 ? (
          <div
            className={`grid gap-3.5 my-2 flex-1 ${
              activeSystems.length === 1
                ? 'grid-cols-1'
                : activeSystems.length === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2'
            }`}
          >
            {activeSystems.map((sys) => {
              const memTotal = sys.info?.memory || 0;
              const memPercent = Math.round(sys.stats?.mp || 0);
              const memUsed = memPercent ? memTotal * (memPercent / 100) : 0;
              const cpu = Math.round(sys.stats?.cpu || 0);
              const disk = Math.round(sys.stats?.dp || 0);

              let temp: number | undefined;
              if (sys.stats?.temperatures) {
                const vals = Object.values(sys.stats.temperatures) as number[];
                if (vals.length > 0) temp = Math.round(vals[0]);
              }

              return (
                <div
                  key={sys.id}
                  onClick={() => {
                    const sysUrl = `${hubUrl.replace(/\/+$/, '')}/system/${encodeURIComponent(sys.name)}`;
                    window.open(sysUrl, openInNewTab ? '_blank' : '_self', 'noopener,noreferrer');
                  }}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 hover:border-indigo-500/40 hover:bg-slate-950/90 transition-all cursor-pointer space-y-2.5 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          sys.status === 'up' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                        }`}
                      />
                      <h4 className="font-bold text-xs text-slate-100 truncate">{sys.name}</h4>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </span>
                  </div>

                  {/* RAM & CPU Bar Meters */}
                  <div className="space-y-2">
                    {/* RAM */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Activity className="w-3 h-3 text-sky-400" />
                          RAM
                        </span>
                        <span className="font-mono text-sky-300 font-semibold">
                          {memPercent}%{' '}
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({formatBytes(memUsed)} / {formatBytes(memTotal)})
                          </span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-sky-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, memPercent))}%` }}
                        />
                      </div>
                    </div>

                    {/* CPU */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-emerald-400" />
                          CPU
                        </span>
                        <span className="font-mono text-emerald-300 font-semibold">{cpu}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, cpu))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Node Badges: Temp, Docker, Disk */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-400">
                    {disk > 0 && (
                      <span className="flex items-center gap-1" title="Disco">
                        <HardDrive className="w-3 h-3 text-purple-400" />
                        {disk}%
                      </span>
                    )}
                    {temp !== undefined && (
                      <span className="flex items-center gap-1" title="Temperatura">
                        <Thermometer className="w-3 h-3 text-amber-400" />
                        {temp}°C
                      </span>
                    )}
                    {sys.stats?.docker !== undefined && (
                      <span className="flex items-center gap-1" title="Contenedores Docker">
                        <Container className="w-3 h-3 text-sky-400" />
                        {sys.stats.docker}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
            <span>Cargando tus 4 servidores desde Beszel Hub...</span>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {category && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50 font-medium text-[11px]">
                {category.name}
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-indigo-950/80 text-indigo-300 border border-indigo-500/40">
              BESZEL CLUSTER
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={hubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-indigo-300 hover:text-white flex items-center gap-1"
            >
              <span>Abrir Beszel</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
