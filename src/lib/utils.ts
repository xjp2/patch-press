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


