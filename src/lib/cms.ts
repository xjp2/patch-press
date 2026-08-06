/**
 * CMS Data Loader
 * 
 * Loads content in priority order:
 * 1. Supabase Storage (CDN-cached, updated via admin panel)
 * 2. Local static JSON files (build-time exported)
 * 3. Supabase Database (development fallback)
 * 
 * When forceRefresh=true (admin updates), the Supabase Database is queried first
 * to get the latest content immediately. Public customer traffic uses the default
 * path so it does not hit Supabase on every page load.
 */

import { supabase } from './supabase';

// Type definitions matching the database schema
export interface Product {
  id: string;
  name: string;
  front_image_url: string;
  back_image_url: string;
  base_price: number;
  quantity: number;
  width: number;
  height: number;
  placement_zone: {
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'rectangle' | 'polygon';
    points?: { x: number; y: number }[];
  };
  crop_zone?: any;
  sort_order: number;
}

export interface Patch {
  id: string;
  name: string;
  category: string;
  image_url: string;
  price: number;
  quantity: number;
  width: number;
  height: number;
  content_zone?: any;
  sort_order: number;
}

export interface SiteContent {
  id: string;
  landing_page: any[];
  footer: {
    brandName: string;
    tagline: string;
    copyright?: string;
    instagramUrl?: string;
    facebookUrl?: string;
    twitterUrl?: string;
  };
  global_settings: {
    logoText: string;
    logoImage?: string;
    primaryColor?: string;
    secondaryColor?: string;
    headingFont?: string;
    bodyFont?: string;
    currency?: 'USD' | 'SGD' | 'EUR' | 'GBP' | 'JPY' | 'KRW';
    currencySymbol?: string;
  };
  customize_page: {
    step1Title: string;
    step1Subtitle?: string;
    step2PanelTitle?: string;
    step3Title?: string;
    step3Subtitle?: string;
    howToDesignSteps?: string[];
  };
  navbar?: any;
}

export interface CmsMetadata {
  exportedAt: string;
  supabaseUrl: string;
  version: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory cache with TTL so users always see recent data without hammering the DB
const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_CACHE_TTL = 60 * 1000; // 1 minute

// Timestamp for cache-busting after admin updates
let cacheBuster = Date.now();

/**
 * Update cache buster to force fresh data load
 */
export function refreshCacheBuster(): void {
  cacheBuster = Date.now();
  console.log('🔄 Cache buster updated:', cacheBuster);
}

function getCached<T>(key: string, ttl = DEFAULT_CACHE_TTL): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > ttl) {
    cache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Load from Supabase Storage (CDN-cached, priority 1)
 * Uses cache-busting to get fresh data after admin updates
 */
async function loadFromStorage<T>(path: string, bustCache = false): Promise<T | null> {
  const cacheKey = `storage:${path}:${bustCache ? cacheBuster : 'static'}`;

  if (!bustCache) {
    const cached = getCached<T>(cacheKey);
    if (cached !== undefined) return cached;
  }

  try {
    const { data: { publicUrl } } = supabase
      .storage
      .from('assets')
      .getPublicUrl(`cms/${path}`);

    // Always cache-bust Storage requests to avoid stale CDN data after admin updates
    const url = `${publicUrl}?t=${bustCache ? cacheBuster : Date.now()}`;

    const response = await fetch(url, {
      cache: 'no-cache',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as T;

    // Validate data is not empty
    if (Array.isArray(data) && data.length === 0) {
      throw new Error('Empty array returned');
    }

    setCached(cacheKey, data);
    console.log(`☁️ Loaded ${path} from Storage (${Array.isArray(data) ? data.length : 1} items)`);
    return data;
  } catch (err) {
    console.warn(`Storage load failed for ${path}:`, err);
    return null;
  }
}

/**
 * Load static JSON file (build-time exported, priority 2)
 * Uses cache-busting to ensure fresh content after rebuilds
 */
async function loadStaticFile<T>(filename: string, bustCache = false): Promise<T | null> {
  const cacheKey = bustCache ? `${filename}:fresh` : filename;

  if (!bustCache) {
    const cached = getCached<T>(cacheKey);
    if (cached !== undefined) return cached;
  }

  try {
    // Always cache-bust static JSON so stale build artifacts are never served
    const url = `/cms/${filename}?t=${bustCache ? cacheBuster : Date.now()}`;

    const response = await fetch(url, {
      cache: 'no-cache',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as T;
    setCached(cacheKey, data);
    console.log(`📄 Loaded ${filename} from static files${bustCache ? ' (fresh)' : ''}`);
    return data;
  } catch (err) {
    console.warn(`Failed to load static ${filename}:`, err);
    return null;
  }
}

/**
 * Check if static CMS files exist
 */
export async function hasStaticCms(): Promise<boolean> {
  try {
    const response = await fetch('/cms/metadata.json', { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get CMS metadata
 */
export async function getCmsMetadata(bustCache = false): Promise<CmsMetadata | null> {
  return loadStaticFile<CmsMetadata>('metadata.json', bustCache);
}

/**
 * Load site content - Supabase DB (source of truth) -> Storage -> static JSON fallback
 * @param forceRefresh - Set to true after admin updates to bypass all caches
 */
export async function loadSiteContent(forceRefresh = false): Promise<SiteContent | null> {
  const cacheKey = 'db:site_content';

  if (!forceRefresh) {
    const cached = getCached<SiteContent>(cacheKey);
    if (cached !== undefined) return cached;
  }

  // Priority 1: Supabase Database (source of truth)
  const dbData = await loadSiteContentFromDb();
  if (dbData) {
    console.log('✅ Loaded site content from database');
    setCached(cacheKey, dbData);
    return dbData;
  }

  // Priority 2: In-memory stale cache (better than nothing)
  const stale = getCached<SiteContent>(cacheKey, Infinity);
  if (stale !== undefined) {
    console.warn('⚠️ Using stale cached site content');
    return stale;
  }

  // Priority 3: Supabase Storage fallback
  console.warn('Site content DB load failed, falling back to Storage');
  const storageData = await loadFromStorage<SiteContent>('site-content.json', forceRefresh);
  if (storageData) return storageData;

  // Priority 4: Static files fallback
  const staticData = await loadStaticFile<SiteContent>('site-content.json', forceRefresh);
  if (staticData) return staticData;

  console.error('Failed to load site content from all sources');
  return null;
}

/**
 * Load products - Supabase DB (source of truth) -> Storage -> static JSON fallback
 * @param forceRefresh - Set to true after admin updates to bypass all caches
 */
export async function loadProducts(forceRefresh = false): Promise<Product[]> {
  const cacheKey = 'db:products';

  if (!forceRefresh) {
    const cached = getCached<Product[]>(cacheKey);
    if (cached !== undefined) return cached;
  }

  // Priority 1: Supabase Database (source of truth)
  const dbData = await loadProductsFromDb();
  if (dbData && dbData.length > 0) {
    console.log(`✅ Loaded ${dbData.length} products from database`);
    setCached(cacheKey, dbData);
    return dbData;
  }

  // Priority 2: In-memory stale cache (better than missing products)
  const stale = getCached<Product[]>(cacheKey, Infinity);
  if (stale !== undefined && stale.length > 0) {
    console.warn('⚠️ Using stale cached products');
    return stale;
  }

  // Priority 3: Supabase Storage fallback
  console.warn('Products DB load failed, falling back to Storage');
  const storageData = await loadFromStorage<Product[]>('products.json', forceRefresh);
  if (storageData && storageData.length > 0) return storageData;

  // Priority 4: Static files fallback
  const staticData = await loadStaticFile<Product[]>('products.json', forceRefresh);
  if (staticData && staticData.length > 0) {
    console.log('📄 Loaded products from static files');
    return staticData;
  }

  console.error('Failed to load products from all sources');
  return [];
}

/**
 * Load patches - Supabase DB (source of truth) -> Storage -> static JSON fallback
 * @param forceRefresh - Set to true after admin updates to bypass all caches
 */
export async function loadPatches(forceRefresh = false): Promise<Patch[]> {
  const cacheKey = 'db:patches';

  if (!forceRefresh) {
    const cached = getCached<Patch[]>(cacheKey);
    if (cached !== undefined) return cached;
  }

  // Priority 1: Supabase Database (source of truth)
  const dbData = await loadPatchesFromDb();
  if (dbData && dbData.length > 0) {
    console.log(`✅ Loaded ${dbData.length} patches from database`);
    setCached(cacheKey, dbData);
    return dbData;
  }

  // Priority 2: In-memory stale cache (better than missing patches)
  const stale = getCached<Patch[]>(cacheKey, Infinity);
  if (stale !== undefined && stale.length > 0) {
    console.warn('⚠️ Using stale cached patches');
    return stale;
  }

  // Priority 3: Supabase Storage fallback
  console.warn('Patches DB load failed, falling back to Storage');
  const storageData = await loadFromStorage<Patch[]>('patches.json', forceRefresh);
  if (storageData && storageData.length > 0) return storageData;

  // Priority 4: Static files fallback
  const staticData = await loadStaticFile<Patch[]>('patches.json', forceRefresh);
  if (staticData && staticData.length > 0) {
    console.log('📄 Loaded patches from static files');
    return staticData;
  }

  console.error('Failed to load patches from all sources');
  return [];
}

/**
 * Clear CMS cache (useful after admin updates)
 * Also updates cache buster to force fresh data from CDN
 */
export function clearCmsCache(): void {
  cache.clear();
  refreshCacheBuster();
  console.log('🗑️ CMS cache cleared');
}

/**
 * Load products directly from Supabase DB (source of truth)
 */
async function loadProductsFromDb(): Promise<Product[] | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return null;
    return data;
  } catch (err) {
    console.error('Failed to load products from DB:', err);
    return null;
  }
}

/**
 * Load patches directly from Supabase DB (source of truth)
 */
async function loadPatchesFromDb(): Promise<Patch[] | null> {
  try {
    const { data, error } = await supabase
      .from('patches')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return null;
    return data;
  } catch (err) {
    console.error('Failed to load patches from DB:', err);
    return null;
  }
}

/**
 * Load site content directly from Supabase DB (source of truth)
 */
async function loadSiteContentFromDb(): Promise<SiteContent | null> {
  try {
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('id', 'current')
      .single();

    if (error) throw error;
    if (!data) return null;
    return data;
  } catch (err) {
    console.error('Failed to load site content from DB:', err);
    return null;
  }
}

/**
 * Preload all static CMS data
 * @param forceRefresh - Set to true after admin updates to bypass CDN cache
 */
export async function preloadCmsData(forceRefresh = false): Promise<{
  siteContent: SiteContent | null;
  products: Product[];
  patches: Patch[];
}> {
  const [siteContent, products, patches] = await Promise.all([
    loadSiteContent(forceRefresh),
    loadProducts(forceRefresh),
    loadPatches(forceRefresh)
  ]);

  return { siteContent, products, patches };
}
