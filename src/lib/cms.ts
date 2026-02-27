/**
 * CMS Data Loader
 * 
 * Loads static content from local JSON files (fast, no DB hits)
 * Falls back to Supabase in development if files don't exist
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

/**
 * Load static JSON file
 */
async function loadStaticFile<T>(filename: string): Promise<T | null> {
  // Check cache first
  if (cache.has(filename)) {
    return cache.get(filename);
  }

  try {
    const response = await fetch(`/cms/${filename}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    cache.set(filename, data);
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
export async function getCmsMetadata(): Promise<CmsMetadata | null> {
  return loadStaticFile<CmsMetadata>('metadata.json');
}

/**
 * Load site content - static first, fallback to Supabase
 */
export async function loadSiteContent(): Promise<SiteContent | null> {
  // Try static first
  const staticData = await loadStaticFile<SiteContent>('site-content.json');
  if (staticData) {
    console.log('📄 Loaded site content from static file');
    return staticData;
  }

  // Fallback to Supabase (development mode)
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
 * Load products - static first, fallback to Supabase
 */
export async function loadProducts(): Promise<Product[]> {
  // Try static first
  const staticData = await loadStaticFile<Product[]>('products.json');
  if (staticData) {
    console.log(`🎒 Loaded ${staticData.length} products from static file`);
    return staticData;
  }

  // Fallback to Supabase (development mode)
  console.log('🌐 Loading products from Supabase...');
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Failed to load products:', error);
    return [];
  }

  return data || [];
}

/**
 * Load patches - static first, fallback to Supabase
 */
export async function loadPatches(): Promise<Patch[]> {
  // Try static first
  const staticData = await loadStaticFile<Patch[]>('patches.json');
  if (staticData) {
    console.log(`🧵 Loaded ${staticData.length} patches from static file`);
    return staticData;
  }

  // Fallback to Supabase (development mode)
  console.log('🌐 Loading patches from Supabase...');
  const { data, error } = await supabase
    .from('patches')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Failed to load patches:', error);
    return [];
  }

  return data || [];
}

/**
 * Clear CMS cache (useful after admin updates)
 */
export function clearCmsCache(): void {
  cache.clear();
  console.log('🗑️ CMS cache cleared');
}

/**
 * Preload all static CMS data
 */
export async function preloadCmsData(): Promise<{
  siteContent: SiteContent | null;
  products: Product[];
  patches: Patch[];
}> {
  const [siteContent, products, patches] = await Promise.all([
    loadSiteContent(),
    loadProducts(),
    loadPatches()
  ]);

  return { siteContent, products, patches };
}
