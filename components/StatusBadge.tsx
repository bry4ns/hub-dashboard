'use client';

import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { CardItem } from '@/types';

interface StatusBadgeProps {
  card: CardItem;
  onRefresh?: (cardId: string) => Promise<void>;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  card,
  onRefresh,
  size = 'md',
}) => {
  const [isChecking, setIsChecking] = useState(false);

  if (!card.checkStatus) {
    return null;
  }

  const status = card.lastStatus;

  const handleManualCheck = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isChecking || !onRefresh) return;

    try {
      setIsChecking(true);
      await onRefresh(card.id);
    } finally {
      setIsChecking(false);
    }
  };

  // Determine appearance based on status
  let badgeColor = 'bg-slate-800/80 text-slate-400 border-slate-700/60';
  let dotColor = 'bg-slate-500';
  let label = 'Sin verificar';
  let Icon = HelpCircle;

  if (isChecking) {
    badgeColor = 'bg-sky-950/70 text-sky-300 border-sky-600/40';
    dotColor = 'bg-sky-400';
    label = 'Comprobando...';
  } else if (status) {
    if (status.isOnline) {
      const isSlow = status.latencyMs && status.latencyMs > 1500;
      if (isSlow) {
        badgeColor = 'bg-amber-950/70 text-amber-300 border-amber-500/40';
        dotColor = 'bg-amber-400';
        label = `Lento • ${status.latencyMs}ms`;
        Icon = AlertTriangle;
      } else {
        badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
        dotColor = 'bg-emerald-400 animate-pulse';
        label = status.latencyMs ? `${status.latencyMs}ms` : 'Online';
        Icon = CheckCircle2;
      }
    } else {
      badgeColor = 'bg-rose-950/80 text-rose-300 border-rose-500/40';
      dotColor = 'bg-rose-500';
      label = status.error || status.statusText || 'Offline';
      Icon = XCircle;
    }
  }

  return (
    <div
      onClick={handleManualCheck}
      title={
        status
          ? `Estado: ${status.statusText || (status.isOnline ? 'Online' : 'Offline')}\nLatencia: ${status.latencyMs ? status.latencyMs + 'ms' : 'N/A'}\nÚltimo chequeo: ${new Date(status.lastChecked).toLocaleTimeString()}\nHaz clic para volver a comprobar`
          : 'Haz clic para comprobar estado'
      }
      className={`group/badge inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border backdrop-blur-md cursor-pointer transition-all duration-200 hover:scale-105 ${badgeColor}`}
    >
      {isChecking ? (
        <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
      ) : (
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
      )}
      <span className="truncate max-w-[120px]">{label}</span>
      {onRefresh && (
        <RefreshCw className="w-2.5 h-2.5 opacity-0 group-hover/badge:opacity-100 transition-opacity ml-0.5 text-slate-400 hover:text-white" />
      )}
    </div>
  );
};
