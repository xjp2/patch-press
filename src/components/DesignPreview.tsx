import { useRef, useState, useEffect } from 'react';
import { getClipAndCenter, fixImagePath } from '../lib/utils';
import type { PlacementZone } from '../lib/utils';

interface PatchOverlay {
  id: string;
  name: string;
  image: string;
  x: number; // percentage (0-100) relative to product image
  y: number;
  rotation: number;
  widthPercent: number;
  heightPercent: number;
  contentZone?: {
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'rectangle' | 'polygon';
    points?: { x: number; y: number }[];
  };
}

interface DesignPreviewProps {
  productImage: string;
  patches: PatchOverlay[];
  placementZone?: PlacementZone;
  maxWidth?: number;
  className?: string;
  showPatchNumbers?: boolean;
}

/**
 * DesignPreview — Renders a product image with patches overlaid at exact positions.
 *
 * How it works:
 * - The wrapper sizes itself to match the image's natural aspect ratio.
 * - The image is `w-full object-contain` so it fills the wrapper width.
 * - Patches are absolutely positioned children of the SAME wrapper.
 * - Percentages (x, y, widthPercent, heightPercent) are relative to the wrapper,
 *   which exactly matches the rendered image — same as CustomizePage.
 *
 * This component is the single source of truth for patch rendering across
 * OrderDetailPage, AdminOrderManagement, and CraftingView.
 */
export function DesignPreview({
  productImage,
  patches,
  placementZone,
  maxWidth = 260,
  className = '',
  showPatchNumbers = false,
}: DesignPreviewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  const measure = () => {
    const img = imgRef.current;
    if (img && img.naturalWidth > 0) {
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    }
  };

  useEffect(() => {
    measure();
  }, [productImage]);

  const s = getClipAndCenter(placementZone);

  // Compute wrapper style so the container matches the image aspect ratio.
  // If no image loaded yet, use a fallback aspect ratio (1:1) so the
  // container doesn't collapse.
  const aspect = imgSize ? `${imgSize.w} / ${imgSize.h}` : '1 / 1';

  return (
    <div
      className={`relative mx-auto ${className}`}
      style={{ maxWidth, aspectRatio: aspect }}
    >
      {/* Transform wrapper shifts image + patches together */}
      <div className="relative w-full h-full" style={{ transform: s.transform }}>
        <img
          ref={imgRef}
          src={fixImagePath(productImage) || '/placeholder-product.png'}
          alt="Product design"
          className="w-full h-full object-contain"
          style={{ clipPath: s.clipPath }}
          onLoad={measure}
          draggable={false}
        />

        {/* Patch overlays */}
        {patches.map((patch, index) => {
          const cz = patch.contentZone || { x: 0, y: 0, width: 100, height: 100 };
          const cx = cz.x + cz.width / 2;
          const cy = cz.y + cz.height / 2;

          return (
            <div
              key={patch.id}
              className="absolute"
              style={{
                left: `${patch.x}%`,
                top: `${patch.y}%`,
                width: `${patch.widthPercent}%`,
                height: `${patch.heightPercent}%`,
                transform: `rotate(${patch.rotation}deg)`,
                transformOrigin: `${cx}% ${cy}%`,
              }}
            >
              <img
                src={fixImagePath(patch.image)}
                alt={patch.name}
                className="w-full h-full object-contain drop-shadow-md"
                style={{
                  clipPath: patch.contentZone
                    ? patch.contentZone.type === 'polygon' && patch.contentZone.points
                      ? `polygon(${patch.contentZone.points.map((p) => `${p.x}% ${p.y}%`).join(', ')})`
                      : `inset(${patch.contentZone.y}% ${100 - (patch.contentZone.x + patch.contentZone.width)}% ${100 - (patch.contentZone.y + patch.contentZone.height)}% ${patch.contentZone.x}%)`
                    : 'none',
                }}
                draggable={false}
              />
              {showPatchNumbers && (
                <div
                  className="absolute w-5 h-5 bg-pink text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg pointer-events-none"
                  style={{
                    left: `${cx}%`,
                    top: `${cy}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {index + 1}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
