import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { optimizedImageMappings } from "../generated/optimized-images"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Return the original path, preferring a build-time optimized local image (WebP/AVIF)
 * when one exists. Admin-uploaded images from Supabase Storage are returned as-is.
 */
export function fixImagePath(path?: string): string {
  if (!path) return '';
  // Prefer the build-time optimized image (WebP/AVIF) when one exists
  return optimizedImageMappings[path] || path;
}

/**
 * Return the best available image URL.
 * Currently applies the build-time optimization mapping. Supabase image
 * transformations are disabled, so width/height are reserved for future use.
 */
export function getResizedImageUrl(url: string | undefined, _width: number, _height?: number): string {
  // Width/height are reserved for future responsive sizing; optimization is
  // currently applied via the build-time image optimization manifest.
  void _width;
  void _height;
  return fixImagePath(url);
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


