import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Fix legacy image paths that wrongly include /products/ or /patches/ prefixes */
export function fixImagePath(path?: string): string {
  if (!path) return '';
  return path.replace(/^\/products\//, '/').replace(/^\/patches\//, '/');
}

/**
 * Resize a Supabase Storage image via the image transformation API.
 * Non-Supabase URLs are returned unchanged.
 */
export function getResizedImageUrl(url: string | undefined, width: number, height?: number): string {
  if (!url) return '';
  // Only transform Supabase storage public URLs
  const match = url.match(/^(https?:\/\/[^/]+\.supabase\.co)\/storage\/v1\/object\/public\/(.+)$/);
  if (!match) return url;
  const [, base, path] = match;
  const h = height || width;
  return `${base}/storage/v1/render/image/public/${path}?width=${width}&height=${h}&quality=80&resize=contain`;
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


