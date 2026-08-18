'use client';

import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  LayoutGrid,
  Move,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { ViewMode } from '@/types';

interface CanvasControlsProps {
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onAutoArrange?: () => void;
}

const ZOOM_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5];

export const CanvasControls: React.FC<CanvasControlsProps> = ({
  zoom,
  onZoomChange,
  viewMode,
  onViewModeChange,
  onAutoArrange,
}) => {
  const handleZoomIn = () => {
    onZoomChange(Math.min(2.0, Number((zoom + 0.15).toFixed(2))));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(0.4, Number((zoom - 0.15).toFixed(2))));
  };

  const handleResetZoom = () => {
    onZoomChange(1.0);
  };

  return (
    <aside aria-label="Controles del Canvas y Zoom" className="fixed bottom-6 right-6 z-40 flex items-center gap-2 p-1.5 rounded-2xl glass-panel shadow-2xl border border-slate-750 backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* View Mode Toggle: Canvas vs Grid */}
      <div className="flex items-center bg-slate-950/70 p-1 rounded-xl border border-slate-800/80">
        <button
          type="button"
          onClick={() => onViewModeChange('grid')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            viewMode === 'grid'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Modo Cuadrícula Dinámica"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Grid</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange('canvas')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            viewMode === 'canvas'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Modo Canvas Libre (Mover y redimensionar con mouse)"
        >
          <Move className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Canvas Libre</span>
        </button>
      </div>

      {/* Auto Arrange in Canvas Mode */}
      {viewMode === 'canvas' && onAutoArrange && (
        <button
          type="button"
          onClick={onAutoArrange}
          title="Auto-organizar tarjetas en el canvas"
          className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-sky-300 text-xs font-medium border border-slate-800 flex items-center gap-1.5 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden md:inline">Auto-ordenar</span>
        </button>
      )}

      {/* Zoom Controls */}
      <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= 0.4}
          title="Alejar (Zoom Out)"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors disabled:opacity-30"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        {/* Zoom Presets Pills */}
        <div className="flex items-center gap-0.5 px-1">
          {ZOOM_PRESETS.map((p) => {
            const isSelected = Math.abs(zoom - p) < 0.05;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onZoomChange(p)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  isSelected
                    ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {Math.round(p * 100)}%
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= 2.0}
          title="Acercar (Zoom In)"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors disabled:opacity-30"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleResetZoom}
          title="Restablecer al 100%"
          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-800/80 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
