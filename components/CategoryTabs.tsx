'use client';

import React from 'react';
import { Layers, Star, AlertCircle, CheckCircle2, Tag } from 'lucide-react';
import { Category, CardItem } from '@/types';

interface CategoryTabsProps {
  categories: Category[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  cards: CardItem[];
  filterStatus: 'all' | 'online' | 'offline' | 'pinned';
  onFilterStatusChange: (status: 'all' | 'online' | 'offline' | 'pinned') => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeTab,
  onTabChange,
  cards,
  filterStatus,
  onFilterStatusChange,
}) => {
  const pinnedCount = cards.filter((c) => c.isPinned).length;
  const offlineCount = cards.filter(
    (c) => c.checkStatus && c.lastStatus && !c.lastStatus.isOnline
  ).length;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2 border-b border-slate-800/80">
      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 no-scrollbar">
        <button
          type="button"
          onClick={() => {
            onTabChange('all');
            if (filterStatus === 'pinned') onFilterStatusChange('all');
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all flex-shrink-0 ${
            activeTab === 'all' && filterStatus !== 'pinned'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-900/30'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Todos</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 font-mono">
            {cards.length}
          </span>
        </button>

        {/* Pinned Tab */}
        <button
          type="button"
          onClick={() => {
            onTabChange('all');
            onFilterStatusChange(filterStatus === 'pinned' ? 'all' : 'pinned');
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all flex-shrink-0 ${
            filterStatus === 'pinned'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${filterStatus === 'pinned' ? 'fill-amber-400 text-amber-400' : ''}`} />
          <span>Favoritos</span>
          {pinnedCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 font-mono">
              {pinnedCount}
            </span>
          )}
        </button>

        {/* Custom Categories */}
        {categories.map((cat) => {
          const count = cards.filter((c) => c.category === cat.id).length;
          const isActive = activeTab === cat.id && filterStatus !== 'pinned';

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                onTabChange(cat.id);
                if (filterStatus === 'pinned') onFilterStatusChange('all');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all flex-shrink-0 ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-900/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{cat.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 font-mono">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Offline Alert Filter (if any) */}
      {offlineCount > 0 && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => onFilterStatusChange(filterStatus === 'offline' ? 'all' : 'offline')}
            className={`px-3 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all ${
              filterStatus === 'offline'
                ? 'bg-rose-950 text-rose-300 border-rose-500 shadow-md shadow-rose-950/50'
                : 'bg-rose-950/40 text-rose-400 border-rose-600/30 hover:bg-rose-950/70'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>{offlineCount} caídos o con problemas</span>
          </button>
        </div>
      )}
    </div>
  );
};
