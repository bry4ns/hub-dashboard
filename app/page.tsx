'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Globe, Search, RefreshCw, Layers, Sparkles, Filter, Server } from 'lucide-react';
import { CardItem, Category, CardSize, ViewMode, CardLayout } from '@/types';
import { Navbar } from '@/components/Navbar';
import { CategoryTabs } from '@/components/CategoryTabs';
import { ProjectCard } from '@/components/ProjectCard';
import { CardModal } from '@/components/CardModal';
import { BackupModal } from '@/components/BackupModal';
import { ClusterStatsSummary } from '@/components/ClusterStatsSummary';
import { CanvasControls } from '@/components/CanvasControls';

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | undefined>();

  const [cards, setCards] = useState<CardItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<any>(null);

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline' | 'pinned'>('all');

  // Canvas & View State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [canvasZoom, setCanvasZoom] = useState<number>(1.0);

  // Drag & Resize State
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize' | null;
    cardId: string | null;
    startX: number;
    startY: number;
    initialLayout: CardLayout;
  }>({
    type: null,
    cardId: null,
    startX: 0,
    startY: 0,
    initialLayout: { x: 0, y: 0, w: 320, h: 220 },
  });

  // Modals
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardItem | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Status check loading
  const [isCheckingAll, setIsCheckingAll] = useState(false);

  // 1. Check Auth & Load Initial Data
  const loadDashboardData = useCallback(async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();

      if (!authData.authenticated) {
        router.push('/login');
        return;
      }

      setCurrentUser(authData.username);

      const cardsRes = await fetch('/api/cards');
      const cardsData = await cardsRes.json();

      if (cardsRes.ok) {
        setCards(cardsData.cards || []);
        setCategories(cardsData.categories || []);
        setSettings(cardsData.settings || null);
        if (cardsData.settings?.viewMode) {
          setViewMode(cardsData.settings.viewMode);
        }
        if (cardsData.settings?.canvasZoom) {
          setCanvasZoom(cardsData.settings.canvasZoom);
        }
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Periodic automatic status check (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      handleCheckAllStatus(false);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cards]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Check Single Card Status
  const handleRefreshSingleStatus = async (cardId: string) => {
    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId }),
      });
      const data = await res.json();
      if (data.status) {
        setCards((prev) =>
          prev.map((c) => (c.id === cardId ? { ...c, lastStatus: data.status } : c))
        );
      }
    } catch (err) {
      console.error('Error checking card status:', err);
    }
  };

  // Check All Cards Status
  const handleCheckAllStatus = async (showLoading: boolean = true) => {
    if (showLoading) setIsCheckingAll(true);
    try {
      const res = await fetch('/api/status/check-all', { method: 'POST' });
      const data = await res.json();
      if (data.statuses) {
        setCards((prev) =>
          prev.map((c) => {
            if (data.statuses[c.id]) {
              return { ...c, lastStatus: data.statuses[c.id] };
            }
            return c;
          })
        );
      }
    } catch (err) {
      console.error('Error checking all statuses:', err);
    } finally {
      if (showLoading) setIsCheckingAll(false);
    }
  };

  // Save / Update Card
  const handleSaveCard = async (cardData: Partial<CardItem>) => {
    const isEdit = Boolean(cardData.id);
    const endpoint = isEdit ? `/api/cards/${cardData.id}` : '/api/cards';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardData),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al guardar');

    if (isEdit) {
      setCards((prev) => prev.map((c) => (c.id === data.card.id ? data.card : c)));
    } else {
      setCards((prev) => [...prev, data.card]);
      if (data.card.checkStatus) {
        handleRefreshSingleStatus(data.card.id);
      }
    }
  };

  // Quick Toggle Card Size
  const handleToggleCardSize = async (card: CardItem) => {
    const sizeOrder: CardSize[] = ['normal', 'wide', 'large', 'compact'];
    const currentIdx = sizeOrder.indexOf(card.cardSize || 'normal');
    const nextSize = sizeOrder[(currentIdx + 1) % sizeOrder.length];

    const updated = { ...card, cardSize: nextSize };
    setCards((prev) => prev.map((c) => (c.id === card.id ? updated : c)));

    try {
      await fetch(`/api/cards/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardSize: nextSize }),
      });
    } catch (err) {
      console.error('Error toggling card size:', err);
    }
  };

  // Delete Card
  const handleDeleteCard = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta tarjeta?')) return;
    try {
      const res = await fetch(`/api/cards/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCards((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error('Error deleting card:', err);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (card: CardItem) => {
    const updated = { ...card, isPinned: !card.isPinned };
    setCards((prev) => prev.map((c) => (c.id === card.id ? updated : c)));

    try {
      await fetch(`/api/cards/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !card.isPinned }),
      });
    } catch (err) {
      console.error('Error updating pin:', err);
    }
  };

  // Create Category
  const handleCreateCategory = async (name: string): Promise<Category | null> => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok && data.category) {
        setCategories((prev) => [...prev, data.category]);
        return data.category;
      }
      return null;
    } catch (err) {
      console.error('Error creating category:', err);
      return null;
    }
  };

  // Canvas Drag & Resize Mouse Handlers
  const handleCardDragStart = (e: React.MouseEvent, card: CardItem) => {
    const layout = card.layout || { x: 50, y: 50, w: 320, h: 220 };
    setDragState({
      type: 'move',
      cardId: card.id,
      startX: e.clientX,
      startY: e.clientY,
      initialLayout: { ...layout },
    });
  };

  const handleCardResizeStart = (e: React.MouseEvent, card: CardItem) => {
    const layout = card.layout || {
      x: 0,
      y: 0,
      w: card.cardSize === 'wide' ? 620 : 320,
      h: card.cardSize === 'large' ? 420 : 220,
    };
    setDragState({
      type: 'resize',
      cardId: card.id,
      startX: e.clientX,
      startY: e.clientY,
      initialLayout: { ...layout },
    });
  };

  // Global mouse move listener for smooth dragging/resizing with zoom compensation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.type || !dragState.cardId) return;

      const deltaX = (e.clientX - dragState.startX) / canvasZoom;
      const deltaY = (e.clientY - dragState.startY) / canvasZoom;

      if (dragState.type === 'move') {
        const newX = Math.max(0, Math.round(dragState.initialLayout.x + deltaX));
        const newY = Math.max(0, Math.round(dragState.initialLayout.y + deltaY));

        setCards((prev) =>
          prev.map((c) =>
            c.id === dragState.cardId
              ? {
                  ...c,
                  layout: {
                    ...(c.layout || dragState.initialLayout),
                    x: newX,
                    y: newY,
                  },
                }
              : c
          )
        );
      } else if (dragState.type === 'resize') {
        const newW = Math.max(240, Math.round(dragState.initialLayout.w + deltaX));
        const newH = Math.max(140, Math.round(dragState.initialLayout.h + deltaY));

        setCards((prev) =>
          prev.map((c) =>
            c.id === dragState.cardId
              ? {
                  ...c,
                  layout: {
                    ...(c.layout || dragState.initialLayout),
                    w: newW,
                    h: newH,
                  },
                }
              : c
          )
        );
      }
    };

    const handleMouseUp = async () => {
      if (!dragState.type || !dragState.cardId) return;

      const cardToPersist = cards.find((c) => c.id === dragState.cardId);
      const cardId = dragState.cardId;

      setDragState({
        type: null,
        cardId: null,
        startX: 0,
        startY: 0,
        initialLayout: { x: 0, y: 0, w: 320, h: 220 },
      });

      if (cardToPersist && cardToPersist.layout) {
        try {
          await fetch(`/api/cards/${cardId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ layout: cardToPersist.layout }),
          });
        } catch (err) {
          console.error('Error saving card layout:', err);
        }
      }
    };

    if (dragState.type) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, canvasZoom, cards]);

  // Auto Arrange in Canvas Mode
  const handleAutoArrangeCanvas = async () => {
    const colWidth = 340;
    const colGap = 24;
    const rowGap = 24;
    const cols = Math.max(1, Math.floor((window.innerWidth - 80) / colWidth));

    const colHeights = new Array(cols).fill(20);

    const updatedCards = cards.map((card, idx) => {
      // find shortest column
      let minCol = 0;
      for (let i = 1; i < cols; i++) {
        if (colHeights[i] < colHeights[minCol]) {
          minCol = i;
        }
      }

      const cardW = card.cardSize === 'wide' || card.cardSize === 'large' ? colWidth * 2 + colGap : colWidth;
      const cardH = card.cardSize === 'large' ? 420 : 230;

      const x = minCol * (colWidth + colGap) + 20;
      const y = colHeights[minCol];

      colHeights[minCol] += cardH + rowGap;

      const newLayout: CardLayout = { x, y, w: cardW, h: cardH };
      return { ...card, layout: newLayout };
    });

    setCards(updatedCards);

    // Persist all layouts
    for (const c of updatedCards) {
      fetch(`/api/cards/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: c.layout }),
      }).catch(console.error);
    }
  };

  // Filtered Cards Memo
  const filteredCards = useMemo(() => {
    return cards
      .filter((card) => {
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchesTitle = card.title.toLowerCase().includes(term);
          const matchesUrl = card.url.toLowerCase().includes(term);
          const matchesDesc = card.description?.toLowerCase().includes(term);
          if (!matchesTitle && !matchesUrl && !matchesDesc) return false;
        }

        if (activeCategoryTab !== 'all' && card.category !== activeCategoryTab) {
          return false;
        }

        if (filterStatus === 'pinned' && !card.isPinned) {
          return false;
        }
        if (filterStatus === 'offline') {
          return card.checkStatus && card.lastStatus && !card.lastStatus.isOnline;
        }
        if (filterStatus === 'online') {
          return card.checkStatus && card.lastStatus?.isOnline;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return a.order - b.order;
      });
  }, [cards, searchTerm, activeCategoryTab, filterStatus]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onNewCard={() => {
          setEditingCard(null);
          setIsCardModalOpen(true);
        }}
        onCheckAllStatus={() => handleCheckAllStatus(true)}
        isCheckingAll={isCheckingAll}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onLogout={handleLogout}
        username={currentUser}
        totalCards={cards.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Cluster Infrastructure Summary Banner */}
        {settings?.showClusterSummary !== false && <ClusterStatsSummary cards={cards} />}

        {/* Category Tabs & Quick Status Bar */}
        <CategoryTabs
          categories={categories}
          activeTab={activeCategoryTab}
          onTabChange={setActiveCategoryTab}
          cards={cards}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
        />

        {/* Dynamic View: Canvas Libre vs Grid */}
        {filteredCards.length > 0 ? (
          viewMode === 'canvas' ? (
            /* Freeform Canvas View */
            <div
              className="relative w-full min-h-[800px] rounded-3xl border border-slate-800/80 bg-slate-950/40 p-4 overflow-auto backdrop-blur-sm"
              style={{
                backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            >
              <div
                className="relative min-w-full min-h-[900px] transition-transform duration-100 ease-out origin-top-left"
                style={{
                  transform: `scale(${canvasZoom})`,
                  width: `${100 / canvasZoom}%`,
                }}
              >
                {filteredCards.map((card, idx) => {
                  const defaultLayout: CardLayout = card.layout || {
                    x: (idx % 3) * 360 + 20,
                    y: Math.floor(idx / 3) * 260 + 20,
                    w: card.cardSize === 'wide' || card.cardSize === 'large' ? 620 : 320,
                    h: card.cardSize === 'large' ? 420 : 230,
                  };

                  return (
                    <ProjectCard
                      key={card.id}
                      card={{ ...card, layout: defaultLayout }}
                      categories={categories}
                      viewMode="canvas"
                      onEdit={(c) => {
                        setEditingCard(c);
                        setIsCardModalOpen(true);
                      }}
                      onDelete={handleDeleteCard}
                      onTogglePin={handleTogglePin}
                      onToggleSize={handleToggleCardSize}
                      onRefreshStatus={handleRefreshSingleStatus}
                      onCardDragStart={handleCardDragStart}
                      onCardResizeStart={handleCardResizeStart}
                      openInNewTab={settings?.openInNewTab ?? true}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            /* Grid View */
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 [grid-auto-flow:dense] transition-all"
              style={{
                transform: `scale(${canvasZoom})`,
                transformOrigin: 'top center',
              }}
            >
              {filteredCards.map((card) => (
                <ProjectCard
                  key={card.id}
                  card={card}
                  categories={categories}
                  viewMode="grid"
                  onEdit={(c) => {
                    setEditingCard(c);
                    setIsCardModalOpen(true);
                  }}
                  onDelete={handleDeleteCard}
                  onTogglePin={handleTogglePin}
                  onToggleSize={handleToggleCardSize}
                  onRefreshStatus={handleRefreshSingleStatus}
                  openInNewTab={settings?.openInNewTab ?? true}
                />
              ))}
            </div>
          )
        ) : (
          /* Empty State */
          <div className="py-20 flex flex-col items-center justify-center text-center rounded-3xl border border-dashed border-slate-800 bg-slate-950/40 p-8">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
              <Globe className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-200">
              {searchTerm ? 'No se encontraron resultados' : 'No hay tarjetas en esta sección'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {searchTerm
                ? 'Intenta con otro término de búsqueda o limpia el filtro.'
                : 'Empieza añadiendo tus aplicaciones, proyectos web, servidores o APIs favoritas.'}
            </p>
            <button
              type="button"
              onClick={() => {
                if (searchTerm) setSearchTerm('');
                setEditingCard(null);
                setIsCardModalOpen(true);
              }}
              className="mt-5 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-sky-900/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Tarjeta</span>
            </button>
          </div>
        )}
      </main>

      {/* Floating Canvas & Zoom Controls */}
      <CanvasControls
        zoom={canvasZoom}
        onZoomChange={setCanvasZoom}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAutoArrange={handleAutoArrangeCanvas}
      />

      {/* Modals */}
      <CardModal
        isOpen={isCardModalOpen}
        onClose={() => {
          setIsCardModalOpen(false);
          setEditingCard(null);
        }}
        onSave={handleSaveCard}
        editingCard={editingCard}
        categories={categories}
        onCreateCategory={handleCreateCategory}
        onBeszelSyncComplete={loadDashboardData}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onDataRestored={loadDashboardData}
      />
    </div>
  );
}
