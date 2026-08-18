'use client';

import React, { useState } from 'react';
import { X, Download, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setStatusMessage(null);
      const res = await fetch('/api/backup');
      if (!res.ok) throw new Error('Error al exportar');

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage({ type: 'success', text: 'Copia de seguridad descargada con éxito.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error al exportar' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setStatusMessage(null);

      const text = await file.text();
      const parsed = JSON.parse(text);

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al importar datos');

      setStatusMessage({
        type: 'success',
        text: `Restauración completada: ${data.cardsCount} tarjetas cargadas.`,
      });
      onDataRestored();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'El archivo no es un JSON de respaldo válido' });
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-750 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100">Copia de Seguridad</h2>
            <p className="text-xs text-slate-400">Exporta o importa tus tarjetas y configuraciones</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/70 border border-emerald-600/40 text-emerald-300'
                : 'bg-rose-950/70 border border-rose-600/40 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-slate-200">Exportar Datos</h4>
              <p className="text-[11px] text-slate-400">Descarga un archivo JSON con todas tus tarjetas</p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Exportar
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-slate-200">Importar Datos</h4>
              <p className="text-[11px] text-slate-400">Restaura tarjetas desde un archivo de respaldo</p>
            </div>
            <label className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer">
              {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Importar
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                disabled={isImporting}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
