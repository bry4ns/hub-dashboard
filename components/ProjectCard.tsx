'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ExternalLink,
  MoreVertical,
  Pin,
  Globe,
  Edit2,
  Trash2,
  Maximize2,
  Minimize2,
  Layers,
  GripHorizontal,
} from 'lucide-react';
import { CardItem, Category, ViewMode } from '@/types';
import { StatusBadge } from './StatusBadge';
import { ServerStatsCard } from './ServerStatsCard';
import { BeszelMultiNodeCard } from './BeszelMultiNodeCard';

interface ProjectCardProps {
  card: CardItem;
  categories: Category[];
  viewMode?: ViewMode;
  onEdit: (card: CardItem) => void;
  onDelete: (id: string) => void;
  onTogglePin: (card: CardItem) => void;
  onToggleSize: (card: CardItem) => void;
  onRefreshStatus: (id: string) => Promise<void>;
  onCardDragStart?: (e: React.MouseEvent, card: CardItem) => void;
  onCardResizeStart?: (e: React.MouseEvent, card: CardItem) => void;
  openInNewTab?: boolean;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  card,
  categories,
  viewMode = 'grid',
  onEdit,
  onDelete,
  onTogglePin,
  onToggleSize,
  onRefreshStatus,
  onCardDragStart,
  onCardResizeStart,
  openInNewTab = true,
}) => {
  // Delegate multi-node Beszel widget
  if (card.cardType === 'beszel' && card.serverConfig?.beszelDesign === 'multi_node') {
    return (
      <BeszelMultiNodeCard
        card={card}
        categories={categories}
        viewMode={viewMode}
        onEdit={onEdit}
        onDelete={onDelete}
        onTogglePin={onTogglePin}
        onToggleSize={onToggleSize}
        onRefreshStatus={onRefreshStatus}
        onCardDragStart={onCardDragStart}
        onCardResizeStart={onCardResizeStart}
        openInNewTab={openInNewTab}
      />
    );
  }

  // Delegate server cards to ServerStatsCard
  if (card.cardType === 'server_stats' || card.cardType === 'beszel') {
    return (
      <ServerStatsCard
        card={card}
        categories={categories}
        viewMode={viewMode}
        onEdit={onEdit}
        onDelete={onDelete}
        onTogglePin={onTogglePin}
        onToggleSize={onToggleSize}
        onRefreshStatus={onRefreshStatus}
        onCardDragStart={onCardDragStart}
        onCardResizeStart={onCardResizeStart}
        openInNewTab={openInNewTab}
      />
    );
  }

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const category = categories.find((c) => c.id === card.category);
  const isCompact = card.cardSize === 'compact';
  const isWide = card.cardSize === 'wide' || card.cardSize === 'large';
  const isLarge = card.cardSize === 'large';

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleCardClick = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('.menu-container') ||
      (e.target as HTMLElement).closest('.resize-handle') ||
      (e.target as HTMLElement).closest('.drag-handle')
    ) {
      return;
    }
    if (card.url && card.url !== '#') {
      window.open(card.url, openInNewTab ? '_blank' : '_self', 'noopener,noreferrer');
    }
  };

  // Inline custom sizing in canvas mode
  const canvasStyle: React.CSSProperties =
    viewMode === 'canvas' && card.layout
      ? {
          position: 'absolute',
          left: `${card.layout.x}px`,
          top: `${card.layout.y}px`,
          width: `${card.layout.w}px`,
          height: card.layout.h ? `${card.layout.h}px` : undefined,
          borderTop: card.accentColor ? `3px solid ${card.accentColor}` : undefined,
        }
      : {
          borderTop: card.accentColor ? `3px solid ${card.accentColor}` : undefined,
        };

  // Compact Pill Card
  if (isCompact && viewMode !== 'canvas') {
    return (
      <div
        onClick={handleCardClick}
        className={`group relative flex items-center justify-between p-3.5 rounded-2xl glass-panel glass-panel-hover overflow-hidden cursor-pointer transition-all duration-300 border border-slate-800/80 hover:border-sky-500/40 hover:shadow-xl ${
          card.isPinned ? 'ring-1 ring-sky-500/30' : ''
        }`}
        style={{
          borderLeft: card.accentColor ? `3px solid ${card.accentColor}` : undefined,
        }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700/60 p-1 flex items-center justify-center flex-shrink-0">
            {card.iconUrl ? (
              <img
                src={card.iconUrl}
                alt=""
                className="w-5 h-5 object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Globe className="w-4 h-4 text-sky-400" />
            )}
          </div>
          <div className="truncate">
            <h4 className="font-semibold text-xs text-slate-100 group-hover:text-sky-300 transition-colors truncate">
              {card.title}
            </h4>
            <span className="text-[11px] text-slate-400 block truncate">
              {card.url.replace(/^https?:\/\//, '')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {card.checkStatus && <StatusBadge card={card} onRefresh={onRefreshStatus} size="sm" />}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSize(card);
            }}
            title="Agrandar"
            className="p-1 rounded text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Standard, Wide, Large & Canvas Freeform Card
  return (
    <div
      onClick={handleCardClick}
      style={canvasStyle}
      className={`group relative flex flex-col justify-between rounded-2xl glass-panel glass-panel-hover overflow-hidden cursor-pointer transition-all duration-300 border border-slate-800/80 hover:border-sky-500/40 hover:shadow-2xl hover:shadow-sky-950/30 ${
        viewMode === 'grid'
          ? isLarge
            ? 'col-span-1 sm:col-span-2 row-span-2'
            : isWide
            ? 'col-span-1 sm:col-span-2'
            : 'col-span-1'
          : ''
      } ${card.isPinned ? 'ring-1 ring-sky-500/30' : ''}`}
    >
      {/* Optional Preview Image Banner */}
      {card.imageUrl ? (
        <div
          className={`relative w-full ${
            isLarge ? 'h-48' : 'h-36'
          } bg-slate-950 overflow-hidden border-b border-slate-800/50`}
        >
          <img
            src={card.imageUrl}
            alt={card.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
        </div>
      ) : null}

      <div className="p-5 flex-1 flex flex-col">
        {/* Card Header: Drag Handle (Canvas mode), Icon, Category & Actions */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {/* Canvas Drag Handle */}
            {viewMode === 'canvas' && onCardDragStart && (
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onCardDragStart(e, card);
                }}
                className="drag-handle cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-sky-400 -ml-1 transition-colors"
                title="Mantén clic para arrastrar por el canvas"
              >
                <GripHorizontal className="w-4 h-4" />
              </div>
            )}

            <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700/60 p-1.5 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:border-sky-500/50 transition-colors">
              {card.iconUrl ? (
                <img
                  src={card.iconUrl}
                  alt=""
                  className="w-7 h-7 object-contain rounded-md"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Globe className="w-5 h-5 text-sky-400" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 group-hover:text-sky-300 transition-colors line-clamp-1 text-base">
                  {card.title}
                </h3>
                {card.isPinned && (
                  <Pin className="w-3.5 h-3.5 text-sky-400 fill-sky-400 rotate-45 flex-shrink-0" />
                )}
              </div>
              <span className="text-xs text-slate-400 block truncate max-w-[190px] opacity-75">
                {card.url.replace(/^https?:\/\//, '')}
              </span>
            </div>
          </div>

          {/* Quick Actions / Menu */}
          <div className="relative menu-container flex items-center gap-1" ref={menuRef}>
            {/* Quick Resize in Grid Mode */}
            {viewMode === 'grid' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSize(card);
                }}
                title={isWide ? 'Tamaño normal (1x1)' : 'Agrandar (2x1)'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-800/80 transition-all opacity-0 group-hover:opacity-100"
              >
                {isWide ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(card);
              }}
              title={card.isPinned ? 'Desfijar de favoritos' : 'Fijar como favorito'}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-800/80 transition-all ${
                card.isPinned ? 'text-sky-400' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              <Pin className={`w-4 h-4 ${card.isPinned ? 'fill-sky-400 rotate-45' : ''}`} />
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
              <div className="absolute right-0 top-8 z-30 w-40 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl py-1.5 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onEdit(card);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-sky-600/20 flex items-center gap-2 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onToggleSize(card);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  Cambiar tamaño
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

        {/* Description */}
        {card.description && (
          <p className="text-xs text-slate-300/80 line-clamp-2 mb-4 leading-relaxed flex-1">
            {card.description}
          </p>
        )}

        {/* Footer: Category and Status Badge */}
        <div className="mt-auto pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 truncate">
            {category && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50 font-medium text-[11px]">
                {category.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {card.checkStatus && <StatusBadge card={card} onRefresh={onRefreshStatus} />}
            <div className="p-1 rounded text-slate-500 group-hover:text-sky-400 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Bottom-Right Corner Resize Handle */}
      {onCardResizeStart && (
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            onCardResizeStart(e, card);
          }}
          className="resize-handle absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end p-1 text-slate-600 hover:text-sky-400 group-hover:text-slate-400 transition-colors z-20"
          title="Agarrar y arrastrar para redimensionar"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15L15 21M21 8L8 21" />
          </svg>
        </div>
      )}
    </div>
  );
};
