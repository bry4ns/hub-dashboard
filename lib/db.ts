import fs from 'fs';
import path from 'path';
import { DashboardData, CardItem, Category, UserAccount } from '@/types';
import {
  getPostgresPool,
  pgGetUsers,
  pgCreateUser,
  pgGetCategories,
  pgSaveCategory,
  pgDeleteCategory,
  pgGetCards,
  pgSaveCard,
  pgDeleteCard,
  pgGetSettings,
  pgSaveSettings,
} from './postgres';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'hub-data.json');

const INITIAL_DATA: DashboardData = {
  users: [],
  categories: [
    { id: 'cat-general', name: 'General', order: 0 },
    { id: 'cat-dev', name: 'Desarrollo & Apps', order: 1 },
    { id: 'cat-apis', name: 'APIs & Servicios', order: 2 },
    { id: 'cat-tools', name: 'Herramientas', order: 3 },
  ],
  cards: [
    {
      id: 'demo-1',
      title: 'GitHub',
      url: 'https://github.com',
      description: 'Plataforma de desarrollo y alojamiento de repositorios',
      category: 'cat-dev',
      iconUrl: 'https://github.githubassets.com/favicons/favicon.png',
      imageUrl: 'https://github.githubassets.com/images/modules/site/social-cards/github-social.png',
      accentColor: '#24292e',
      isPinned: true,
      checkStatus: true,
      cardSize: 'normal',
      cardType: 'app',
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-2',
      title: 'Vercel',
      url: 'https://vercel.com',
      description: 'Despliegue y hosting de aplicaciones frontend y serverless',
      category: 'cat-dev',
      iconUrl: 'https://assets.vercel.com/image/upload/front/favicon/vercel/favicon.ico',
      accentColor: '#000000',
      isPinned: false,
      checkStatus: true,
      cardSize: 'normal',
      cardType: 'app',
      order: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-server-local',
      title: 'Host Local Server',
      url: 'http://localhost:3000',
      description: 'Monitor del servidor host local con métricas de RAM y CPU en vivo',
      category: 'cat-apis',
      cardSize: 'wide',
      cardType: 'server_stats',
      serverConfig: {
        serverType: 'host',
      },
      accentColor: '#10b981',
      isPinned: true,
      checkStatus: true,
      order: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  settings: {
    siteTitle: 'My Dev & App Hub',
    theme: 'dark',
    autoCheckIntervalMinutes: 5,
    openInNewTab: true,
    showClusterSummary: true,
    viewMode: 'grid',
    canvasZoom: 1.0,
  },
};

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function isPostgresEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabase(): DashboardData {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    saveDatabase(INITIAL_DATA);
    return INITIAL_DATA;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DashboardData;
    if (!parsed.categories) parsed.categories = INITIAL_DATA.categories;
    if (!parsed.cards) parsed.cards = INITIAL_DATA.cards;
    if (!parsed.users) parsed.users = INITIAL_DATA.users;
    if (!parsed.settings) parsed.settings = INITIAL_DATA.settings;
    return parsed;
  } catch (error) {
    console.error('Error reading database file, returning default data:', error);
    return INITIAL_DATA;
  }
}

export function saveDatabase(data: DashboardData): void {
  ensureDataDir();
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

// User Helpers (Sync & Async)
export async function getUsersAsync(): Promise<UserAccount[]> {
  if (isPostgresEnabled()) {
    try {
      return await pgGetUsers();
    } catch (e) {
      console.warn('Postgres error in getUsersAsync, fallback to local:', e);
    }
  }
  return getUsers();
}

export function getUsers(): UserAccount[] {
  return getDatabase().users;
}

export async function getUserByUsernameAsync(username: string): Promise<UserAccount | undefined> {
  const users = await getUsersAsync();
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export function getUserByUsername(username: string): UserAccount | undefined {
  return getUsers().find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export async function createUserAsync(username: string, passwordHash: string): Promise<UserAccount> {
  const newUser: UserAccount = {
    id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isPostgresEnabled()) {
    try {
      await pgCreateUser(newUser);
    } catch (e) {
      console.warn('Postgres error in createUserAsync:', e);
    }
  }

  // Also sync locally
  const db = getDatabase();
  db.users.push(newUser);
  saveDatabase(db);
  return newUser;
}

export function createUser(username: string, passwordHash: string): UserAccount {
  const db = getDatabase();
  const newUser: UserAccount = {
    id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.users.push(newUser);
  saveDatabase(db);
  return newUser;
}

export async function hasAnyUserAsync(): Promise<boolean> {
  const users = await getUsersAsync();
  return users.length > 0;
}

export function hasAnyUser(): boolean {
  return getUsers().length > 0;
}

// Cards Helpers (Sync & Async)
export async function getCardsAsync(): Promise<CardItem[]> {
  if (isPostgresEnabled()) {
    try {
      return await pgGetCards();
    } catch (e) {
      console.warn('Postgres error in getCardsAsync, fallback to local:', e);
    }
  }
  return getCards();
}

export function getCards(): CardItem[] {
  return getDatabase().cards;
}

export async function saveCardAsync(cardData: Partial<CardItem> & { id?: string }): Promise<CardItem> {
  const now = new Date().toISOString();
  const cards = await getCardsAsync();
  const existingCard = cardData.id ? cards.find((c) => c.id === cardData.id) : undefined;
  const id = cardData.id || ('card-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));

  const cardToSave: CardItem = {
    title: cardData.title ?? existingCard?.title ?? 'Nueva Tarjeta',
    url: cardData.url ?? existingCard?.url ?? '#',
    description: cardData.description !== undefined ? cardData.description : (existingCard?.description ?? ''),
    category: cardData.category ?? existingCard?.category ?? 'cat-general',
    cardSize: cardData.cardSize ?? existingCard?.cardSize ?? 'normal',
    cardType: cardData.cardType ?? existingCard?.cardType ?? 'app',
    serverConfig: cardData.serverConfig !== undefined ? cardData.serverConfig : existingCard?.serverConfig,
    layout: cardData.layout !== undefined ? cardData.layout : existingCard?.layout,
    iconUrl: cardData.iconUrl !== undefined ? cardData.iconUrl : (existingCard?.iconUrl ?? ''),
    imageUrl: cardData.imageUrl !== undefined ? cardData.imageUrl : (existingCard?.imageUrl ?? ''),
    accentColor: cardData.accentColor ?? existingCard?.accentColor ?? '#38bdf8',
    isPinned: cardData.isPinned !== undefined ? cardData.isPinned : (existingCard?.isPinned ?? false),
    checkStatus: cardData.checkStatus !== undefined ? cardData.checkStatus : (existingCard?.checkStatus ?? true),
    healthEndpoint: cardData.healthEndpoint !== undefined ? cardData.healthEndpoint : (existingCard?.healthEndpoint ?? ''),
    lastStatus: cardData.lastStatus !== undefined ? cardData.lastStatus : existingCard?.lastStatus,
    order: cardData.order ?? existingCard?.order ?? cards.length,
    id,
    createdAt: existingCard?.createdAt || now,
    updatedAt: now,
  };

  if (isPostgresEnabled()) {
    try {
      await pgSaveCard(cardToSave);
    } catch (e) {
      console.warn('Postgres error in saveCardAsync:', e);
    }
  }

  // Also sync locally
  saveCard(cardToSave);
  return cardToSave;
}

export function saveCard(cardData: Partial<CardItem> & { id?: string }): CardItem {
  const db = getDatabase();
  const now = new Date().toISOString();

  if (cardData.id) {
    const idx = db.cards.findIndex((c) => c.id === cardData.id);
    if (idx !== -1) {
      const updated: CardItem = {
        ...db.cards[idx],
        ...cardData,
        id: cardData.id,
        updatedAt: now,
      };
      db.cards[idx] = updated;
      saveDatabase(db);
      return updated;
    }
  }

  const newCard: CardItem = {
    title: cardData.title || 'Nueva Tarjeta',
    url: cardData.url || '#',
    description: cardData.description || '',
    category: cardData.category || 'cat-general',
    cardSize: cardData.cardSize || 'normal',
    cardType: cardData.cardType || 'app',
    serverConfig: cardData.serverConfig,
    layout: cardData.layout,
    iconUrl: cardData.iconUrl || '',
    imageUrl: cardData.imageUrl || '',
    accentColor: cardData.accentColor || '#38bdf8',
    isPinned: cardData.isPinned || false,
    checkStatus: cardData.checkStatus !== undefined ? cardData.checkStatus : true,
    healthEndpoint: cardData.healthEndpoint || '',
    lastStatus: cardData.lastStatus,
    id: 'card-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    order: cardData.order ?? db.cards.length,
    createdAt: now,
    updatedAt: now,
  };
  db.cards.push(newCard);
  saveDatabase(db);
  return newCard;
}

export async function deleteCardAsync(id: string): Promise<boolean> {
  if (isPostgresEnabled()) {
    try {
      await pgDeleteCard(id);
    } catch (e) {
      console.warn('Postgres error in deleteCardAsync:', e);
    }
  }
  return deleteCard(id);
}

export function deleteCard(id: string): boolean {
  const db = getDatabase();
  const initialLen = db.cards.length;
  db.cards = db.cards.filter((c) => c.id !== id);
  if (db.cards.length !== initialLen) {
    saveDatabase(db);
    return true;
  }
  return false;
}

export function updateCardStatus(id: string, status: CardItem['lastStatus']): void {
  const db = getDatabase();
  const card = db.cards.find((c) => c.id === id);
  if (card) {
    card.lastStatus = status;
    saveDatabase(db);
  }
}

// Categories Helpers
export async function getCategoriesAsync(): Promise<Category[]> {
  if (isPostgresEnabled()) {
    try {
      return await pgGetCategories();
    } catch (e) {
      console.warn('Postgres error in getCategoriesAsync:', e);
    }
  }
  return getCategories();
}

export function getCategories(): Category[] {
  return getDatabase().categories;
}

export async function saveCategoryAsync(category: Omit<Category, 'id'> & { id?: string }): Promise<Category> {
  const id = category.id || ('cat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));
  const catToSave: Category = {
    ...category,
    id,
    order: category.order ?? 99,
  };

  if (isPostgresEnabled()) {
    try {
      await pgSaveCategory(catToSave);
    } catch (e) {
      console.warn('Postgres error in saveCategoryAsync:', e);
    }
  }

  saveCategory(category);
  return catToSave;
}

export function saveCategory(category: Omit<Category, 'id'> & { id?: string }): Category {
  const db = getDatabase();
  if (category.id) {
    const idx = db.categories.findIndex((c) => c.id === category.id);
    if (idx !== -1) {
      db.categories[idx] = { ...db.categories[idx], ...category, id: category.id };
      saveDatabase(db);
      return db.categories[idx];
    }
  }

  const newCat: Category = {
    ...category,
    id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    order: category.order ?? db.categories.length,
  };
  db.categories.push(newCat);
  saveDatabase(db);
  return newCat;
}

export async function deleteCategoryAsync(id: string): Promise<boolean> {
  if (isPostgresEnabled()) {
    try {
      await pgDeleteCategory(id);
    } catch (e) {
      console.warn('Postgres error in deleteCategoryAsync:', e);
    }
  }
  return deleteCategory(id);
}

export function deleteCategory(id: string): boolean {
  const db = getDatabase();
  const initialLen = db.categories.length;
  db.categories = db.categories.filter((c) => c.id !== id);
  if (db.categories.length !== initialLen) {
    saveDatabase(db);
    return true;
  }
  return false;
}

// Settings
export function getSettings() {
  return getDatabase().settings;
}

export async function getSettingsAsync(): Promise<DashboardData['settings']> {
  if (isPostgresEnabled()) {
    try {
      const pgSettings = await pgGetSettings();
      if (pgSettings) return pgSettings;
    } catch (e) {
      console.warn('Postgres error in getSettingsAsync:', e);
    }
  }
  return getSettings();
}

export function updateSettings(settings: Partial<DashboardData['settings']>) {
  const db = getDatabase();
  db.settings = { ...db.settings, ...settings };
  saveDatabase(db);
  return db.settings;
}

export async function updateSettingsAsync(settings: Partial<DashboardData['settings']>): Promise<DashboardData['settings']> {
  const current = await getSettingsAsync();
  const updated = { ...current, ...settings };

  if (isPostgresEnabled()) {
    try {
      await pgSaveSettings(updated);
    } catch (e) {
      console.warn('Postgres error in updateSettingsAsync:', e);
    }
  }

  return updateSettings(settings);
}
