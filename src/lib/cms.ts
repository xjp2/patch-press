/**
 * CMS Data Loader
 * 
 * Loads content in priority order:
 * 1. Supabase Database (source of truth), with retry + timeout
 * 2. Static build-time JSON files (last-resort fallback when DB is unreachable)
 * 3. In-memory stale cache (only within the same session after a real DB error)
 * 
 * Static files are exported at build time (npm run export-cms). They may be stale
 * compared to live DB edits, so they are only used when the DB is unreachable.
 * When the DB succeeds, its data replaces any stale static content in memory.
 * 
 * When forceRefresh=true (admin updates), the in-memory cache is bypassed and
 * a fresh DB request is made. Public customer traffic uses the cache to avoid
 * hammering Supabase on every render.
 * 
 * Important: an empty DB result (e.g., zero products) is NOT treated as an error.
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
    step3Title: string;
    step3Subtitle?: string;
    howToDesignSteps?: string[];
  };
  navbar?: any;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory cache with TTL so users always see recent data without hammering the DB
const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_CACHE_TTL = 60 * 1000; // 1 minute
const DB_TIMEOUT_MS = 15_000; // 15 seconds (was 8s; slow networks/VPNs need more headroom)
const STATIC_CMS_BASE = '/cms/';

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
 * Run a promise with a timeout. Note: this races the promise; the underlying
 * Supabase request may still complete in the background but we stop waiting.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Retry an async operation with exponential backoff.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelay = 800): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(`⏳ CMS retry ${i + 1}/${retries} after error, waiting ${delay}ms:`, err);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Fetch a static JSON file with a short timeout. Returns null on failure.
 */
async function fetchStaticJson<T>(filename: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5_000);
    const res = await fetch(`${STATIC_CMS_BASE}${filename}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      console.warn(`Static CMS file not available: ${filename} (${res.status})`);
      return null;
    }
    const data = await res.json();
    console.log(`✅ Loaded static fallback: ${filename}`);
    return data as T;
  } catch (err) {
    console.warn(`⚠️ Failed to load static fallback ${filename}:`, err);
    return null;
  }
}

/**
 * Load site content from Supabase DB first, then static JSON fallback.
 */
export async function loadSiteContent(forceRefresh = false): Promise<{ data: SiteContent | null; fromFallback: boolean }> {
  const cacheKey = 'db:site_content';

  if (!forceRefresh) {
    const cached = getCached<SiteContent>(cacheKey);
    if (cached !== undefined) return { data: cached, fromFallback: false };
  }

  try {
    const dbResult = await withRetry(
      () => withTimeout(loadSiteContentFromDb(), DB_TIMEOUT_MS, 'loadSiteContentFromDb'),
      2,
      800
    );

    if (dbResult.error === null) {
      if (dbResult.data) {
        console.log('✅ Loaded site content from database');
        setCached(cacheKey, dbResult.data);
        return { data: dbResult.data, fromFallback: false };
      }
      // DB is reachable but the row is missing; don't cache or fall back
      console.warn('Site content row missing in DB');
      return { data: null, fromFallback: false };
    }

    throw dbResult.error;
  } catch (err) {
    console.error('❌ Failed to load site content from DB after retry:', err);

    // In-memory stale cache only (survives within a single session, not across refreshes)
    const stale = getCached<SiteContent>(cacheKey, Infinity);
    if (stale !== undefined) {
      console.warn('⚠️ Using stale cached site content');
      return { data: stale, fromFallback: true };
    }

    // Last-resort fallback to build-time static JSON
    const staticData = await fetchStaticJson<SiteContent>('site-content.json');
    if (staticData) {
      console.warn('⚠️ Using build-time static site content fallback');
      setCached(cacheKey, staticData);
      return { data: staticData, fromFallback: true };
    }

    return { data: null, fromFallback: true };
  }
}

/**
 * Load products from Supabase DB first, then static JSON fallback.
 */
export async function loadProducts(forceRefresh = false): Promise<{ data: Product[]; fromFallback: boolean }> {
  const cacheKey = 'db:products';

  if (!forceRefresh) {
    const cached = getCached<Product[]>(cacheKey);
    if (cached !== undefined) return { data: cached, fromFallback: false };
  }

  try {
    const dbResult = await withRetry(
      () => withTimeout(loadProductsFromDb(), DB_TIMEOUT_MS, 'loadProductsFromDb'),
      2,
      800
    );

    if (dbResult.error === null) {
      console.log(`✅ Loaded ${dbResult.data.length} products from database`);
      setCached(cacheKey, dbResult.data);
      return { data: dbResult.data, fromFallback: false };
    }

    throw dbResult.error;
  } catch (err) {
    console.error('❌ Failed to load products from DB after retry:', err);

    const stale = getCached<Product[]>(cacheKey, Infinity);
    if (stale !== undefined && stale.length > 0) {
      console.warn('⚠️ Using stale cached products');
      return { data: stale, fromFallback: true };
    }

    const staticData = await fetchStaticJson<Product[]>('products.json');
    if (staticData && staticData.length > 0) {
      console.warn('⚠️ Using build-time static products fallback');
      setCached(cacheKey, staticData);
      return { data: staticData, fromFallback: true };
    }

    return { data: [], fromFallback: true };
  }
}

/**
 * Load patches from Supabase DB first, then static JSON fallback.
 */
export async function loadPatches(forceRefresh = false): Promise<{ data: Patch[]; fromFallback: boolean }> {
  const cacheKey = 'db:patches';

  if (!forceRefresh) {
    const cached = getCached<Patch[]>(cacheKey);
    if (cached !== undefined) return { data: cached, fromFallback: false };
  }

  try {
    const dbResult = await withRetry(
      () => withTimeout(loadPatchesFromDb(), DB_TIMEOUT_MS, 'loadPatchesFromDb'),
      2,
      800
    );

    if (dbResult.error === null) {
      console.log(`✅ Loaded ${dbResult.data.length} patches from database`);
      setCached(cacheKey, dbResult.data);
      return { data: dbResult.data, fromFallback: false };
    }

    throw dbResult.error;
  } catch (err) {
    console.error('❌ Failed to load patches from DB after retry:', err);

    const stale = getCached<Patch[]>(cacheKey, Infinity);
    if (stale !== undefined && stale.length > 0) {
      console.warn('⚠️ Using stale cached patches');
      return { data: stale, fromFallback: true };
    }

    const staticData = await fetchStaticJson<Patch[]>('patches.json');
    if (staticData && staticData.length > 0) {
      console.warn('⚠️ Using build-time static patches fallback');
      setCached(cacheKey, staticData);
      return { data: staticData, fromFallback: true };
    }

    return { data: [], fromFallback: true };
  }
}

/**
 * Clear CMS in-memory cache (useful after admin updates)
 */
export function clearCmsCache(): void {
  cache.clear();
  console.log('🗑️ CMS cache cleared');
}

type DbResult<T> = { data: T; error: null } | { data: null; error: Error };

/**
 * Load products directly from Supabase DB (source of truth)
 */
async function loadProductsFromDb(): Promise<DbResult<Product[]>> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Failed to load products from DB:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Failed to load products from DB') };
  }
}

/**
 * Load patches directly from Supabase DB (source of truth)
 */
async function loadPatchesFromDb(): Promise<DbResult<Patch[]>> {
  try {
    const { data, error } = await supabase
      .from('patches')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Failed to load patches from DB:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Failed to load patches from DB') };
  }
}

/**
 * Load site content directly from Supabase DB (source of truth)
 */
async function loadSiteContentFromDb(): Promise<DbResult<SiteContent | null>> {
  try {
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('id', 'current')
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Failed to load site content from DB:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Failed to load site content from DB') };
  }
}

/**
 * Preload all static CMS data
 * @param forceRefresh - Set to true after admin updates to bypass CDN cache
 * @returns Object with the loaded content and a flag indicating whether any
 *          of the data came from a fallback source (stale cache or static files)
 */
export async function preloadCmsData(forceRefresh = false): Promise<{
  siteContent: SiteContent | null;
  products: Product[];
  patches: Patch[];
  fromFallback: boolean;
}> {
  const [siteContentResult, productsResult, patchesResult] = await Promise.all([
    loadSiteContent(forceRefresh),
    loadProducts(forceRefresh),
    loadPatches(forceRefresh)
  ]);

  const fromFallback = siteContentResult.fromFallback || productsResult.fromFallback || patchesResult.fromFallback;

  return {
    siteContent: siteContentResult.data,
    products: productsResult.data,
    patches: patchesResult.data,
    fromFallback,
  };
}
