import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Image map loaded from /cms/image-map.json — maps Supabase URLs to local CDN paths */
let imageMap: Record<string, string> | null = null;

export async function loadImageMap(): Promise<void> {
  try {
    const response = await fetch('/cms/image-map.json');
    if (response.ok) {
      imageMap = await response.json();
    }
  } catch {
    // Image map not available — fall back to original URLs
    imageMap = null;
  }
}

/** Convert Supabase URLs to local CDN paths via image map */
export function fixImagePath(path?: string): string {
  if (!path) return '';
  // If this URL is in the image map, use the local CDN path
  if (imageMap && imageMap[path]) {
    return imageMap[path];
  }
  return path;
}

/**
 * Resize a Supabase Storage image via the image transformation API.
 * NOTE: Image transformations require enabling the feature in Supabase project settings.
 * Currently returns the original URL while lazy loading handles performance.
 */
export function getResizedImageUrl(url: string | undefined, _width: number, _height?: number): string {
  // Image transformations are not enabled on this Supabase project (returns 403).
  // Return the original URL; performance is handled by loading="lazy" + decoding="async".
  return url || '';
}

export interface PlacementZone {
  type: 'rectangle' | 'polygon';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: { x: number; y: number }[];
}

/**
 * Compute clipPath + centering transform from a placement zone.
 * Percentages are relative to the element bounding box.
 * The transform shifts the element so the zone center aligns with the element center.
 */
export function getClipAndCenter(zone: PlacementZone | null | undefined) {
  if (!zone) return { clipPath: 'none' as string, transform: 'none' as string };

  let clipPath: string;
  let cx: number, cy: number;

  if (zone.type === 'polygon' && zone.points && zone.points.length > 0) {
    clipPath = `polygon(${zone.points.map((p) => `${p.x}% ${p.y}%`).join(', ')})`;
    const xs = zone.points.map((p) => p.x);
    const ys = zone.points.map((p) => p.y);
    cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  } else {
    clipPath = `inset(${zone.y}% ${100 - ((zone.x || 0) + (zone.width || 0))}% ${100 - ((zone.y || 0) + (zone.height || 0))}% ${zone.x || 0}%)`;
    cx = (zone.x || 0) + (zone.width || 0) / 2;
    cy = (zone.y || 0) + (zone.height || 0) / 2;
  }

  // Shift so the crop center sits at the element center
  const tx = 50 - cx;
  const ty = 50 - cy;

  return { clipPath, transform: `translate(${tx}%, ${ty}%)` };
}


