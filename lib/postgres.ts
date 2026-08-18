import { Pool } from 'pg';
import { CardItem, Category, UserAccount, DashboardData } from '@/types';

let pool: Pool | null = null;
let tablesInitialized = false;

export function getPostgresPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('sslmode=require') || connectionString.includes('ssl=true')
        ? { rejectUnauthorized: false }
        : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
    });
  }

  return pool;
}

export async function initPostgresTables(): Promise<boolean> {
  const p = getPostgresPool();
  if (!p) return false;
  if (tablesInitialized) return true;

  try {
    const client = await p.connect();
    try {
      // 1. Users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS hub_users (
          id VARCHAR(100) PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 2. Categories table
      await client.query(`
        CREATE TABLE IF NOT EXISTS hub_categories (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(150) NOT NULL,
          icon VARCHAR(100),
          color VARCHAR(50),
          order_idx INT DEFAULT 0
        );
      `);

      // 3. Cards table
      await client.query(`
        CREATE TABLE IF NOT EXISTS hub_cards (
          id VARCHAR(100) PRIMARY KEY,
          title VARCHAR(200) NOT NULL,
          url TEXT NOT NULL,
          description TEXT,
          category_id VARCHAR(100) REFERENCES hub_categories(id) ON DELETE SET NULL,
          card_size VARCHAR(50) DEFAULT 'normal',
          card_type VARCHAR(50) DEFAULT 'app',
          server_config JSONB,
          layout JSONB,
          icon_url TEXT,
          image_url TEXT,
          accent_color VARCHAR(50),
          is_pinned BOOLEAN DEFAULT FALSE,
          check_status BOOLEAN DEFAULT TRUE,
          health_endpoint TEXT,
          last_status JSONB,
          order_idx INT DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 4. Settings table
      await client.query(`
        CREATE TABLE IF NOT EXISTS hub_settings (
          id VARCHAR(50) PRIMARY KEY,
          site_title VARCHAR(200) DEFAULT 'My Dev & App Hub',
          theme VARCHAR(50) DEFAULT 'dark',
          auto_check_interval_minutes INT DEFAULT 5,
          open_in_new_tab BOOLEAN DEFAULT TRUE,
          show_cluster_summary BOOLEAN DEFAULT TRUE,
          view_mode VARCHAR(50) DEFAULT 'grid',
          canvas_zoom FLOAT DEFAULT 1.0
        );
      `);

      tablesInitialized = true;
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error initializing PostgreSQL tables:', error);
    return false;
  }
}

// PostgreSQL CRUD Operations
export async function pgGetUsers(): Promise<UserAccount[]> {
  const p = getPostgresPool();
  if (!p) return [];
  await initPostgresTables();

  const res = await p.query('SELECT id, username, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt" FROM hub_users ORDER BY created_at ASC');
  return res.rows;
}

export async function pgCreateUser(user: UserAccount): Promise<UserAccount> {
  const p = getPostgresPool();
  if (!p) return user;
  await initPostgresTables();

  await p.query(
    'INSERT INTO hub_users (id, username, password_hash, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
    [user.id, user.username, user.passwordHash, user.createdAt, user.updatedAt]
  );
  return user;
}

export async function pgGetCategories(): Promise<Category[]> {
  const p = getPostgresPool();
  if (!p) return [];
  await initPostgresTables();

  const res = await p.query('SELECT id, name, icon, color, order_idx as "order" FROM hub_categories ORDER BY order_idx ASC');
  return res.rows;
}

export async function pgSaveCategory(cat: Category): Promise<Category> {
  const p = getPostgresPool();
  if (!p) return cat;
  await initPostgresTables();

  await p.query(`
    INSERT INTO hub_categories (id, name, icon, color, order_idx)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      icon = EXCLUDED.icon,
      color = EXCLUDED.color,
      order_idx = EXCLUDED.order_idx;
  `, [cat.id, cat.name, cat.icon || null, cat.color || null, cat.order]);

  return cat;
}

export async function pgDeleteCategory(id: string): Promise<boolean> {
  const p = getPostgresPool();
  if (!p) return false;
  await initPostgresTables();

  const res = await p.query('DELETE FROM hub_categories WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function pgGetCards(): Promise<CardItem[]> {
  const p = getPostgresPool();
  if (!p) return [];
  await initPostgresTables();

  const res = await p.query(`
    SELECT
      id, title, url, description, category_id as "category",
      card_size as "cardSize", card_type as "cardType",
      server_config as "serverConfig", layout, icon_url as "iconUrl",
      image_url as "imageUrl", accent_color as "accentColor",
      is_pinned as "isPinned", check_status as "checkStatus",
      health_endpoint as "healthEndpoint", last_status as "lastStatus",
      order_idx as "order", created_at as "createdAt", updated_at as "updatedAt"
    FROM hub_cards
    ORDER BY is_pinned DESC, order_idx ASC
  `);

  return res.rows;
}

export async function pgSaveCard(card: CardItem): Promise<CardItem> {
  const p = getPostgresPool();
  if (!p) return card;
  await initPostgresTables();

  await p.query(`
    INSERT INTO hub_cards (
      id, title, url, description, category_id,
      card_size, card_type, server_config, layout,
      icon_url, image_url, accent_color, is_pinned,
      check_status, health_endpoint, last_status, order_idx,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12, $13,
      $14, $15, $16, $17,
      $18, $19
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      url = EXCLUDED.url,
      description = EXCLUDED.description,
      category_id = EXCLUDED.category_id,
      card_size = EXCLUDED.card_size,
      card_type = EXCLUDED.card_type,
      server_config = EXCLUDED.server_config,
      layout = EXCLUDED.layout,
      icon_url = EXCLUDED.icon_url,
      image_url = EXCLUDED.image_url,
      accent_color = EXCLUDED.accent_color,
      is_pinned = EXCLUDED.is_pinned,
      check_status = EXCLUDED.check_status,
      health_endpoint = EXCLUDED.health_endpoint,
      last_status = EXCLUDED.last_status,
      order_idx = EXCLUDED.order_idx,
      updated_at = EXCLUDED.updated_at;
  `, [
    card.id,
    card.title,
    card.url,
    card.description || '',
    card.category || null,
    card.cardSize || 'normal',
    card.cardType || 'app',
    card.serverConfig ? JSON.stringify(card.serverConfig) : null,
    card.layout ? JSON.stringify(card.layout) : null,
    card.iconUrl || '',
    card.imageUrl || '',
    card.accentColor || '#38bdf8',
    card.isPinned,
    card.checkStatus,
    card.healthEndpoint || '',
    card.lastStatus ? JSON.stringify(card.lastStatus) : null,
    card.order,
    card.createdAt,
    card.updatedAt,
  ]);

  return card;
}

export async function pgDeleteCard(id: string): Promise<boolean> {
  const p = getPostgresPool();
  if (!p) return false;
  await initPostgresTables();

  const res = await p.query('DELETE FROM hub_cards WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function pgGetSettings(): Promise<DashboardData['settings'] | null> {
  const p = getPostgresPool();
  if (!p) return null;
  await initPostgresTables();

  const res = await p.query(
    'SELECT site_title as "siteTitle", theme, auto_check_interval_minutes as "autoCheckIntervalMinutes", open_in_new_tab as "openInNewTab", show_cluster_summary as "showClusterSummary", view_mode as "viewMode", canvas_zoom as "canvasZoom" FROM hub_settings WHERE id = $1',
    ['default']
  );
  return res.rows[0] || null;
}

export async function pgSaveSettings(settings: DashboardData['settings']): Promise<DashboardData['settings']> {
  const p = getPostgresPool();
  if (!p) return settings;
  await initPostgresTables();

  await p.query(`
    INSERT INTO hub_settings (id, site_title, theme, auto_check_interval_minutes, open_in_new_tab, show_cluster_summary, view_mode, canvas_zoom)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (id) DO UPDATE SET
      site_title = EXCLUDED.site_title,
      theme = EXCLUDED.theme,
      auto_check_interval_minutes = EXCLUDED.auto_check_interval_minutes,
      open_in_new_tab = EXCLUDED.open_in_new_tab,
      show_cluster_summary = EXCLUDED.show_cluster_summary,
      view_mode = EXCLUDED.view_mode,
      canvas_zoom = EXCLUDED.canvas_zoom;
  `, [
    'default',
    settings.siteTitle || 'My Dev & App Hub',
    settings.theme || 'dark',
    settings.autoCheckIntervalMinutes || 5,
    settings.openInNewTab !== false,
    settings.showClusterSummary !== false,
    settings.viewMode || 'grid',
    settings.canvasZoom || 1.0,
  ]);

  return settings;
}

