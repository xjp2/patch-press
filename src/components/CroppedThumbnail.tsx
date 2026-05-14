import { useRef, useState, useEffect } from 'react';
import type { PlacementZone } from '../lib/utils';

interface CroppedThumbnailProps {
  src: string;
  zone?: PlacementZone;
  className?: string;
  imgClassName?: string;
  alt?: string;
  fallbackSrc?: string;
}

export function CroppedThumbnail({
  src,
  zone,
  className = '',
  imgClassName = '',
  alt = '',
  fallbackSrc = '/placeholder-product.png',
}: CroppedThumbnailProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLImageElement>(null);
  const [dims, setDims] = useState<{
    imgW: number;
    imgH: number;
    wrapW: number;
    wrapH: number;
  } | null>(null);

  useEffect(() => {
    const img = measureRef.current;
    const wrap = wrapRef.current;
    if (!img || !wrap) return;

    const measure = () => {
      setDims({
        imgW: img.naturalWidth,
        imgH: img.naturalHeight,
        wrapW: wrap.clientWidth,
        wrapH: wrap.clientHeight,
      });
    };

    if (img.complete && img.naturalWidth > 0) {
      measure();
    } else {
      img.addEventListener('load', measure);
      return () => img.removeEventListener('load', measure);
    }
  }, [src]);

  const renderContent = () => {
    if (!dims) return null;

    if (zone) {
      let cx: number, cy: number, zw: number, zh: number;
      let clipPath: string;

      if (zone.type === 'polygon' && zone.points && zone.points.length > 0) {
        clipPath = `polygon(${zone.points.map((p) => `${p.x}% ${p.y}%`).join(', ')})`;
        const xs = zone.points.map((p) => p.x);
        const ys = zone.points.map((p) => p.y);
        const minX = Math.min(...xs),
          maxX = Math.max(...xs);
        const minY = Math.min(...ys),
          maxY = Math.max(...ys);
        zw = maxX - minX;
        zh = maxY - minY;
        cx = (minX + maxX) / 2;
        cy = (minY + maxY) / 2;
      } else {
        const x = zone.x || 0;
        const y = zone.y || 0;
        const w = zone.width || 100;
        const h = zone.height || 100;
        clipPath = `inset(${y}% ${100 - (x + w)}% ${100 - (y + h)}% ${x}%)`;
        zw = w;
        zh = h;
        cx = x + w / 2;
        cy = y + h / 2;
      }

      // Convert zone percentages to pixels using ACTUAL image dimensions
      const zoneCxPx = (cx / 100) * dims.imgW;
      const zoneCyPx = (cy / 100) * dims.imgH;
      const zoneWPx = (zw / 100) * dims.imgW;
      const zoneHPx = (zh / 100) * dims.imgH;

      // Scale so the zone fits inside the wrapper with a small padding
      const padding = 0.9;
      const scale = Math.min(
        (dims.wrapW * padding) / Math.max(zoneWPx, 1),
        (dims.wrapH * padding) / Math.max(zoneHPx, 1)
      );

      const left = dims.wrapW / 2 - zoneCxPx * scale;
      const top = dims.wrapH / 2 - zoneCyPx * scale;

      return (
        <div
          className="absolute"
          style={{
            width: dims.imgW * scale,
            height: dims.imgH * scale,
            left,
            top,
          }}
        >
          <img
            src={src}
            alt={alt}
            className={`w-full h-full ${imgClassName}`}
            style={{ clipPath, objectFit: 'cover' }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackSrc;
            }}
          />
        </div>
      );
    }

    // No zone — show full image centered
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src={src}
          alt={alt}
          className={`max-w-full max-h-full w-auto h-auto object-contain ${imgClassName}`}
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackSrc;
          }}
        />
      </div>
    );
  };

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className}`}>
      {/* Hidden image for measuring natural dimensions */}
      <img
        ref={measureRef}
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute opacity-0 pointer-events-none"
        style={{ width: 0, height: 0 }}
      />
      {renderContent()}
    </div>
  );
}
