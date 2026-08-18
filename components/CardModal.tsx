'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Globe,
  Server,
  Image as ImageIcon,
  Palette,
  Activity,
  Check,
  Loader2,
  Plus,
  Maximize2,
  Layers,
  Cpu,
  Zap,
  DownloadCloud,
} from 'lucide-react';
import { CardItem, Category, CardSize, CardType, ServerConfig } from '@/types';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cardData: Partial<CardItem>) => Promise<void>;
  editingCard?: CardItem | null;
  categories: Category[];
  onCreateCategory: (name: string) => Promise<Category | null>;
  onBeszelSyncComplete?: () => void;
}

const ACCENT_COLORS = [
  '#38bdf8', // Sky
  '#818cf8', // Indigo
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

export const CardModal: React.FC<CardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCard,
  categories,
  onCreateCategory,
  onBeszelSyncComplete,
}) => {
  const [cardType, setCardType] = useState<CardType>('app');
  const [cardSize, setCardSize] = useState<CardSize>('normal');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [accentColor, setAccentColor] = useState('#38bdf8');
  const [isPinned, setIsPinned] = useState(false);
  const [checkStatus, setCheckStatus] = useState(true);
  const [healthEndpoint, setHealthEndpoint] = useState('');

  // Beszel / Server Config
  const [serverType, setServerType] = useState<'host' | 'beszel' | 'glances' | 'custom'>('host');
  const [serverEndpoint, setServerEndpoint] = useState('');
  const [serverToken, setServerToken] = useState('');
  const [beszelUsername, setBeszelUsername] = useState('');
  const [beszelPassword, setBeszelPassword] = useState('');
  const [beszelSystems, setBeszelSystems] = useState<any[]>([]);
  const [selectedBeszelSystemId, setSelectedBeszelSystemId] = useState('');
  const [isConnectingBeszel, setIsConnectingBeszel] = useState(false);
  const [isSyncingAllBeszel, setIsSyncingAllBeszel] = useState(false);
  const [beszelMessage, setBeszelMessage] = useState<string | null>(null);

  const [isScraping, setIsScraping] = useState(false);
  const [isTestingStatus, setIsTestingStatus] = useState(false);
  const [testStatusResult, setTestStatusResult] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Category creation inline
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (editingCard) {
      setCardType(editingCard.cardType || 'app');
      setCardSize(editingCard.cardSize || 'normal');
      setTitle(editingCard.title || '');
      setUrl(editingCard.url || '');
      setDescription(editingCard.description || '');
      setCategory(editingCard.category || (categories[0]?.id ?? 'cat-general'));
      setIconUrl(editingCard.iconUrl || '');
      setImageUrl(editingCard.imageUrl || '');
      setAccentColor(editingCard.accentColor || '#38bdf8');
      setIsPinned(editingCard.isPinned ?? false);
      setCheckStatus(editingCard.checkStatus ?? true);
      setHealthEndpoint(editingCard.healthEndpoint || '');

      if (editingCard.serverConfig) {
        setServerType(editingCard.serverConfig.serverType || 'host');
        setServerEndpoint(editingCard.serverConfig.endpoint || '');
        setServerToken(editingCard.serverConfig.token || '');
        setSelectedBeszelSystemId(editingCard.serverConfig.systemId || '');
      }
    } else {
      setCardType('app');
      setCardSize('normal');
      setTitle('');
      setUrl('');
      setDescription('');
      setCategory(categories[0]?.id || 'cat-general');
      setIconUrl('');
      setImageUrl('');
      setAccentColor('#38bdf8');
      setIsPinned(false);
      setCheckStatus(true);
      setHealthEndpoint('');
      setServerType('host');
      setServerEndpoint('');
      setServerToken('');
      setSelectedBeszelSystemId('');
      setBeszelSystems([]);
    }
    setTestStatusResult(null);
    setBeszelMessage(null);
    setErrorMessage('');
  }, [editingCard, isOpen, categories]);

  if (!isOpen) return null;

  // Auto Scrape URL
  const handleAutoScrape = async () => {
    if (!url.trim()) {
      setErrorMessage('Por favor introduce primero una URL para autodetectar.');
      return;
    }

    try {
      setIsScraping(true);
      setErrorMessage('');

      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al analizar la web');
      }

      if (data.metadata) {
        if (!title.trim() || data.metadata.title) {
          setTitle(data.metadata.title || '');
        }
        if (!description.trim() || data.metadata.description) {
          setDescription(data.metadata.description || '');
        }
        if (data.metadata.iconUrl) {
          setIconUrl(data.metadata.iconUrl);
        }
        if (data.metadata.imageUrl) {
          setImageUrl(data.metadata.imageUrl);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'No se pudo obtener información automática de esta URL');
    } finally {
      setIsScraping(false);
    }
  };

  // Connect to Beszel Hub & Fetch Systems
  const handleConnectBeszel = async () => {
    if (!serverEndpoint.trim()) {
      setErrorMessage('Introduce la URL de tu Beszel Hub (ej: http://192.168.1.100:8090)');
      return;
    }

    try {
      setIsConnectingBeszel(true);
      setBeszelMessage(null);
      setErrorMessage('');

      const res = await fetch('/api/beszel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hubUrl: serverEndpoint.trim(),
          username: beszelUsername.trim() || undefined,
          password: beszelPassword || undefined,
          token: serverToken.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.systems) {
        throw new Error(data.error || 'Error al conectar con Beszel Hub');
      }

      setBeszelSystems(data.systems);
      if (data.token) {
        setServerToken(data.token);
      }

      if (data.systems.length > 0) {
        const first = data.systems[0];
        setSelectedBeszelSystemId(first.id);
        if (!title) setTitle(first.name);
        if (!url) setUrl(`${serverEndpoint.trim().replace(/\/+$/, '')}/system/${encodeURIComponent(first.name)}`);
        setBeszelMessage(`¡Conectado! Se encontraron ${data.systems.length} servidores en Beszel.`);
      } else {
        setBeszelMessage('Conectado a Beszel, pero aún no tienes sistemas registrados en él.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'No se pudo conectar con Beszel Hub');
    } finally {
      setIsConnectingBeszel(false);
    }
  };

  // Handle Beszel System Selection in dropdown
  const handleSelectBeszelSystem = (sysId: string) => {
    setSelectedBeszelSystemId(sysId);
    const found = beszelSystems.find((s) => s.id === sysId);
    if (found) {
      setTitle(found.name);
      setUrl(`${serverEndpoint.trim().replace(/\/+$/, '')}/system/${encodeURIComponent(found.name)}`);
      setDescription(`CPU: ${found.info?.cores || 1} Cores | ${found.info?.cpu || 'Beszel Node'}`);
    }
  };

  // Bulk Sync all Beszel Servers
  const handleSyncAllBeszel = async () => {
    if (!serverEndpoint.trim()) return;

    try {
      setIsSyncingAllBeszel(true);
      setBeszelMessage(null);
      setErrorMessage('');

      const res = await fetch('/api/beszel/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hubUrl: serverEndpoint.trim(),
          username: beszelUsername.trim() || undefined,
          password: beszelPassword || undefined,
          token: serverToken.trim() || undefined,
          categoryId: category,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al sincronizar');

      setBeszelMessage(data.message);
      if (onBeszelSyncComplete) {
        onBeszelSyncComplete();
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al sincronizar');
    } finally {
      setIsSyncingAllBeszel(false);
    }
  };

  // Test Status
  const handleTestStatus = async () => {
    const target = healthEndpoint.trim() || url.trim();
    if (!target) {
      setErrorMessage('Introduce una URL para probar el estado.');
      return;
    }

    try {
      setIsTestingStatus(true);
      setTestStatusResult(null);
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json();
      if (data.status) {
        if (data.status.isOnline) {
          setTestStatusResult(`🟢 Online (${data.status.statusCode} - ${data.status.latencyMs}ms)`);
        } else {
          setTestStatusResult(`🔴 Inaccesible (${data.status.error || data.status.statusText})`);
        }
      }
    } catch (err: any) {
      setTestStatusResult('🔴 Error de prueba');
    } finally {
      setIsTestingStatus(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('El título es requerido.');
      return;
    }

    let finalUrl = url.trim();
    if (!finalUrl && cardType !== 'app') {
      finalUrl = serverEndpoint.trim() || '#';
    } else if (!finalUrl) {
      setErrorMessage('La URL es requerida.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');

      const serverConfigData: ServerConfig | undefined =
        cardType === 'server_stats' || cardType === 'beszel'
          ? {
              serverType: cardType === 'beszel' ? 'beszel' : serverType,
              endpoint: serverEndpoint.trim() || undefined,
              systemId: selectedBeszelSystemId || undefined,
              token: serverToken.trim() || undefined,
            }
          : undefined;

      await onSave({
        id: editingCard?.id,
        title: title.trim(),
        url: finalUrl,
        description: description.trim(),
        category,
        cardType,
        cardSize,
        serverConfig: serverConfigData,
        iconUrl: iconUrl.trim(),
        imageUrl: imageUrl.trim(),
        accentColor,
        isPinned,
        checkStatus: cardType === 'app' ? checkStatus : true,
        healthEndpoint: healthEndpoint.trim(),
      });

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    const newCat = await onCreateCategory(newCategoryName.trim());
    if (newCat) {
      setCategory(newCat.id);
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-750 p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {cardType === 'beszel' ? (
                <Zap className="w-5 h-5 text-indigo-400" />
              ) : cardType === 'server_stats' ? (
                <Cpu className="w-5 h-5 text-emerald-400" />
              ) : (
                <Globe className="w-5 h-5 text-sky-400" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {editingCard ? 'Editar Tarjeta' : 'Añadir Nueva Tarjeta'}
              </h2>
              <p className="text-xs text-slate-400">
                Configura accesos rápidos, auto-scraping o monitoreo con Beszel & Servidores
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-950/70 border border-rose-600/40 text-rose-300 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {beszelMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-indigo-950/80 border border-indigo-600/50 text-indigo-200 text-xs font-medium">
            {beszelMessage}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Card Type Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Tipo de Tarjeta
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setCardType('app');
                  setAccentColor('#38bdf8');
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  cardType === 'app'
                    ? 'bg-sky-600/20 border-sky-500 text-sky-300 shadow-md shadow-sky-950/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>App / Web</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCardType('beszel');
                  setServerType('beszel');
                  setAccentColor('#818cf8');
                  setCardSize('wide');
                  if (!title) setTitle('Beszel Server');
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  cardType === 'beszel'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-950/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Zap className="w-4 h-4 text-indigo-400" />
                <span>Beszel Hub / Servidor</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCardType('server_stats');
                  setServerType('host');
                  setAccentColor('#10b981');
                  setCardSize('wide');
                  if (!title) setTitle('Host Local Server');
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  cardType === 'server_stats'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>Host Local</span>
              </button>
            </div>
          </div>

          {/* Card Size Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Tamaño de Tarjeta (Grid)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'compact', label: 'Compacta', desc: 'Píldora' },
                { id: 'normal', label: 'Normal', desc: '1 x 1' },
                { id: 'wide', label: 'Ancha', desc: '2 x 1' },
                { id: 'large', label: 'Grande', desc: '2 x 2' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCardSize(s.id as CardSize)}
                  className={`py-2 px-2 rounded-xl border text-center transition-all ${
                    cardSize === s.id
                      ? 'bg-sky-600/20 border-sky-500 text-sky-300 font-bold ring-1 ring-sky-500/50'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-semibold">{s.label}</div>
                  <div className="text-[10px] opacity-60">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Beszel Configuration Box */}
          {cardType === 'beszel' && (
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-indigo-200 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  Conexión con Beszel Hub (PocketBase API)
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-500/30">
                  Beszel Native
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-300 mb-1">
                    URL del Beszel Hub <span className="text-indigo-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="http://192.168.1.100:8090 o https://beszel.midominio.com"
                      value={serverEndpoint}
                      onChange={(e) => setServerEndpoint(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl glass-input text-xs"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleConnectBeszel}
                      disabled={isConnectingBeszel || !serverEndpoint.trim()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      {isConnectingBeszel ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      <span>Conectar</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Usuario / Email Beszel (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="admin@ejemplo.com"
                    value={beszelUsername}
                    onChange={(e) => setBeszelUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Contraseña Beszel (Opcional)
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={beszelPassword}
                    onChange={(e) => setBeszelPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>

              {/* Beszel System Dropdown & Bulk Sync */}
              {beszelSystems.length > 0 && (
                <div className="pt-3 border-t border-indigo-500/30 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-indigo-300 mb-1.5">
                      Seleccionar Servidor de Beszel
                    </label>
                    <select
                      value={selectedBeszelSystemId}
                      onChange={(e) => handleSelectBeszelSystem(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl glass-input text-xs bg-slate-900"
                    >
                      {beszelSystems.map((sys) => (
                        <option key={sys.id} value={sys.id} className="bg-slate-900 text-white">
                          {sys.name} ({sys.host}) - Status: {sys.status.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      ¿Tienes varios servidores en Beszel?
                    </span>
                    <button
                      type="button"
                      onClick={handleSyncAllBeszel}
                      disabled={isSyncingAllBeszel}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-medium flex items-center gap-1.5 transition-all"
                    >
                      {isSyncingAllBeszel ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <DownloadCloud className="w-3.5 h-3.5" />
                      )}
                      <span>Importar todos los servidores de Beszel</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Standard App Scrape */}
          {cardType === 'app' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                URL del Proyecto / Web <span className="text-sky-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://github.com o https://mi-api.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl glass-input text-sm"
                  required={cardType === 'app'}
                />
                <button
                  type="button"
                  onClick={handleAutoScrape}
                  disabled={isScraping || !url.trim()}
                  className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-900/30"
                >
                  {isScraping ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Extrayendo...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-sky-200" />
                      <span>Auto-detectar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Title & Category Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Título <span className="text-sky-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Nombre del proyecto o servidor"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Categoría</label>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {isAddingCategory ? 'Cancelar' : 'Nueva'}
                </button>
              </div>

              {isAddingCategory ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nombre de categoría"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl glass-input text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewCategory}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium"
                  >
                    Crear
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm bg-slate-900"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-slate-900 text-slate-100">
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Descripción
            </label>
            <textarea
              rows={2}
              placeholder="Breve resumen o detalles del servidor..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 rounded-xl glass-input text-xs resize-none"
            />
          </div>

          {/* Accent Color Palette */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Color de Acento
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {ACCENT_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setAccentColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                    accentColor === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {accentColor === c && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Status Monitoring for App */}
          {cardType === 'app' && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Monitorear Estado en Tiempo Real (Uptime & Latencia)
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkStatus}
                    onChange={(e) => setCheckStatus(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {checkStatus && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="URL de Health Check personalizada (opcional, ej: https://api.miweb.com/health)"
                      value={healthEndpoint}
                      onChange={(e) => setHealthEndpoint(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl glass-input text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleTestStatus}
                      disabled={isTestingStatus}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                      {isTestingStatus ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>Probar</span>
                    </button>
                  </div>
                  {testStatusResult && (
                    <p className="text-xs font-medium text-slate-300">
                      Resultado: <span className="font-semibold">{testStatusResult}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-sky-900/30 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>{editingCard ? 'Guardar Cambios' : 'Añadir Tarjeta'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
