'use client';

import React, { useEffect, useRef } from 'react';
import { Search, Plus, Activity, RefreshCw, Database, LogOut, LayoutGrid, Layers, Globe } from 'lucide-react';

interface NavbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onNewCard: () => void;
  onCheckAllStatus: () => Promise<void>;
  isCheckingAll: boolean;
  onOpenBackup: () => void;
  onLogout: () => void;
  username?: string;
  totalCards: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchTerm,
  onSearchChange,
  onNewCard,
  onCheckAllStatus,
  isCheckingAll,
  onOpenBackup,
  onLogout,
  username,
  totalCards,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' or 'Ctrl+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 p-0.5 shadow-lg shadow-sky-900/30 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Layers className="w-5 h-5 text-sky-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-slate-100">
                Dashboard <span className="text-sky-400">Hub</span>
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700">
                {totalCards} apps
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Lanzador central y monitor de servicios
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar proyecto, app o URL... (Presiona '/' para buscar)"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl glass-input text-xs placeholder:text-slate-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Check All Status Button */}
          <button
            type="button"
            onClick={onCheckAllStatus}
            disabled={isCheckingAll}
            title="Comprobar estado de todas las webs y APIs"
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 border border-slate-750 text-slate-300 hover:text-white hover:border-sky-500/50 text-xs font-medium flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isCheckingAll ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">
              {isCheckingAll ? 'Comprobando...' : 'Comprobar Estado'}
            </span>
          </button>

          {/* New Card Button */}
          <button
            type="button"
            onClick={onNewCard}
            className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-sky-900/30 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva App</span>
          </button>

          {/* Backup Button */}
          <button
            type="button"
            onClick={onOpenBackup}
            title="Copia de seguridad / Restaurar"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
          >
            <Database className="w-4 h-4" />
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            title={`Cerrar sesión (${username || 'Admin'})`}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
