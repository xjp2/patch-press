/**
 * CMS Data Loader
 * 
 * Loads content in priority order:
 * 1. Supabase Storage (CDN-cached, updated via admin panel)
 * 2. Local static JSON files (build-time exported)
 * 3. Supabase Database (development fallback)
 * 
 * This ensures zero DB hits for customer traffic in production.
 */

import { supabase } from './supabase';

// Type definitions matching the database schema
export interface Product {
  id: string;
  name: string;
  front_image_url: string;
  back_image_url: string;
  base_price: number;
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

// Cache for loaded data
const cache = new Map<string, any>();

// Timestamp for cache-busting after admin updates
let cacheBuster = Date.now();

/**
 * Update cache buster to force fresh data load
 */
export function refreshCacheBuster(): void {
  cacheBuster = Date.now();
  console.log('🔄 Cache buster updated:', cacheBuster);
}

/**
 * Load from Supabase Storage (CDN-cached, priority 1)
 * Uses cache-busting to get fresh data after admin updates
 */
async function loadFromStorage<T>(path: string, bustCache = false): Promise<T | null> {
  const cacheKey = `storage:${path}:${bustCache ? cacheBuster : 'static'}`;
  
  // Check in-memory cache (only if not busting)
  if (!bustCache && cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const { data: { publicUrl } } = supabase
      .storage
      .from('assets')
      .getPublicUrl(`cms/${path}`);
    
    // Add cache-busting parameter if requested
    const url = bustCache ? `${publicUrl}?t=${cacheBuster}` : publicUrl;
    
    const response = await fetch(url, {
      cache: bustCache ? 'no-cache' : 'default',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validate data is not empty
    if (Array.isArray(data) && data.length === 0) {
      throw new Error('Empty array returned');
    }
    
    cache.set(cacheKey, data);
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
  
  // Check cache first (unless busting)
  if (!bustCache && cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    // Add cache-busting query param to bypass CDN/browser cache after updates
    const url = bustCache 
      ? `/cms/${filename}?t=${cacheBuster}` 
      : `/cms/${filename}`;
    
    const response = await fetch(url, {
      cache: bustCache ? 'no-cache' : 'default',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    cache.set(cacheKey, data);
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
 * Load site content - Supabase first (for fresh data), fallback to static files
 * @param forceRefresh - Set to true after admin updates to bypass all caches
 */
export async function loadSiteContent(forceRefresh = false): Promise<SiteContent | null> {
  // Priority 1: Supabase (always fresh, especially after admin updates)
  // This ensures localhost and Vercel both see the same content
  if (forceRefresh) {
    console.log('🌐 Force refresh: Loading site content from Supabase...');
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('id', 'current')
      .single();

    if (!error && data) {
      console.log('✅ Loaded fresh site content from Supabase:', {
        landing_page_sections: data.landing_page?.length,
        navbar_fields: data.navbar ? Object.keys(data.navbar) : 'none',
        global_logo: data.global_settings?.logoText,
        first_section_styling: data.landing_page?.[0]?.styling,
      });
      return data;
    }
    console.warn('Supabase load failed, falling back to static files');
  }

  // Priority 2: Static files (for fast loading in production)
  const staticData = await loadStaticFile<SiteContent>('site-content.json', forceRefresh);
  if (staticData) {
    console.log('📄 Loaded site content from static file');
    return staticData;
  }

  // Priority 3: Fallback to Supabase if no static files
  console.log('🌐 Loading site content from Supabase...');
  const { data, error } = await supabase
    .from('site_content')
    .select('*')
    .eq('id', 'current')
    .single();

  if (error) {
    console.error('Failed to load site content:', error);
    return null;
  }

  return data;
}

/**
 * Load products - Storage → Static → Supabase
 * @param forceRefresh - Set to true after admin updates to bypass CDN cache
 */
export async function loadProducts(forceRefresh = false): Promise<Product[]> {
  // Priority 1: Supabase Storage (CDN-cached, updated via admin)
  if (!forceRefresh) {
    const storageData = await loadFromStorage<Product[]>('products.json', false);
    if (storageData && storageData.length > 0) {
      return storageData;
    }
  }

  // Priority 2: Supabase Database (ALWAYS query DB for fresh data after save)
  // This ensures we get the latest data even if CDN export failed
  console.log('🌐 Loading products from Supabase...');
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Failed to load products from DB:', error);
    
    // Fallback to static files if DB fails
    const staticData = await loadStaticFile<Product[]>('products.json');
    if (staticData && staticData.length > 0) {
      console.log('📄 Fallback: Loaded products from static files');
      return staticData;
    }
    
    return [];
  }

  console.log(`✅ Loaded ${data?.length || 0} products from database`);
  return data || [];
}

/**
 * Load patches - Storage → Static → Supabase
 * @param forceRefresh - Set to true after admin updates to bypass CDN cache
 */
export async function loadPatches(forceRefresh = false): Promise<Patch[]> {
  // Priority 1: Supabase Storage (CDN-cached, updated via admin)
  if (!forceRefresh) {
    const storageData = await loadFromStorage<Patch[]>('patches.json', false);
    if (storageData && storageData.length > 0) {
      return storageData;
    }
  }

  // Priority 2: Supabase Database (ALWAYS query DB for fresh data after save)
  console.log('🌐 Loading patches from Supabase...');
  const { data, error } = await supabase
    .from('patches')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Failed to load patches from DB:', error);
    
    // Fallback to static files if DB fails
    const staticData = await loadStaticFile<Patch[]>('patches.json');
    if (staticData && staticData.length > 0) {
      console.log('📄 Fallback: Loaded patches from static files');
      return staticData;
    }
    
    return [];
  }

  console.log(`✅ Loaded ${data?.length || 0} patches from database`);
  return data || [];
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
