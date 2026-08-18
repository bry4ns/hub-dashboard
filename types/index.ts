export type CardSize = 'compact' | 'normal' | 'wide' | 'large' | 'custom';
export type CardType = 'app' | 'server_stats' | 'beszel';
export type BeszelDesign = 'detailed' | 'gauges' | 'compact' | 'multi_node';
export type ViewMode = 'canvas' | 'grid';

export interface CardLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SystemMetrics {
  cpuPercent: number;
  ramUsedBytes: number;
  ramTotalBytes: number;
  ramPercent: number;
  diskUsedBytes?: number;
  diskTotalBytes?: number;
  diskPercent?: number;
  networkRx?: number;
  networkTx?: number;
  uptimeSeconds?: number;
  hostname?: string;
  osPlatform?: string;
  lastUpdated: string;
}

export interface ServerConfig {
  serverType: 'host' | 'beszel' | 'glances' | 'custom';
  endpoint?: string;
  token?: string;
  systemId?: string;
  beszelDesign?: BeszelDesign;
  cachedMetrics?: SystemMetrics;
}

export interface CardItem {
  id: string;
  title: string;
  url: string;
  description: string;
  category: string;
  cardSize?: CardSize;
  cardType?: CardType;
  serverConfig?: ServerConfig;
  layout?: CardLayout;
  iconUrl?: string;
  imageUrl?: string;
  accentColor?: string;
  isPinned: boolean;
  checkStatus: boolean;
  healthEndpoint?: string;
  lastStatus?: {
    isOnline: boolean;
    statusCode: number | null;
    statusText: string;
    latencyMs: number | null;
    lastChecked: string;
    error?: string;
  };
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  order: number;
}

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScrapedMetadata {
  title: string;
  description: string;
  iconUrl: string;
  imageUrl: string;
  siteName: string;
}

export interface StatusCheckResult {
  isOnline: boolean;
  statusCode: number | null;
  statusText: string;
  latencyMs: number | null;
  lastChecked: string;
  error?: string;
}

export interface DashboardData {
  users: UserAccount[];
  categories: Category[];
  cards: CardItem[];
  settings: {
    siteTitle: string;
    theme: 'dark' | 'light' | 'system';
    autoCheckIntervalMinutes: number;
    openInNewTab: boolean;
    showClusterSummary: boolean;
    viewMode: ViewMode;
    canvasZoom: number;
  };
}
