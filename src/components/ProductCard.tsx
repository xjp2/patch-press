import { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { Product } from '../AdminPanel';
import { useCurrency } from '../context/CurrencyContext';
import { getResizedImageUrl, getStockState } from '../lib/utils';

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

export function ProductCard({ product, isSelected, onClick, index }: ProductCardProps) {
  const { formatPrice } = useCurrency();
  const stockState = getStockState(product.quantity);
  const soldOut = stockState === 'sold_out';
  const lowStock = stockState === 'low';
  const cardRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const measureImgRef = useRef<HTMLImageElement>(null);

  const [dims, setDims] = useState<{
    imgW: number;
    imgH: number;
    wrapW: number;
    wrapH: number;
  } | null>(null);

  // Measure image + wrapper dimensions once image loads
  useEffect(() => {
    const img = measureImgRef.current;
    const wrap = wrapperRef.current;
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
  }, [product.frontImage]);

  // Build the visible image element
  const zone = product.cropZone || product.placementZone;
  let cropDiv: React.ReactNode = null;

  if (dims) {
    if (zone) {
      // --- CROPPED PRODUCT: show only the placement zone, scaled to fill ---
      let cx: number, cy: number, zw: number, zh: number;
      if (zone.type === 'polygon' && zone.points && zone.points.length > 0) {
        const xs = zone.points.map((p) => p.x);
        const ys = zone.points.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        cx = (minX + maxX) / 2;
        cy = (minY + maxY) / 2;
        zw = maxX - minX;
        zh = maxY - minY;
      } else {
        cx = (zone.x || 0) + (zone.width || 0) / 2;
        cy = (zone.y || 0) + (zone.height || 0) / 2;
        zw = zone.width || 100;
        zh = zone.height || 100;
      }

      const zoneCxPx = (cx / 100) * dims.imgW;
      const zoneCyPx = (cy / 100) * dims.imgH;
      const zoneWPx = (zw / 100) * dims.imgW;
      const zoneHPx = (zh / 100) * dims.imgH;

      const padding = 0.9;
      const scale = Math.min(
        (dims.wrapW * padding) / zoneWPx,
        (dims.wrapH * padding) / zoneHPx
      );

      const left = dims.wrapW / 2 - zoneCxPx * scale;
      const top = dims.wrapH / 2 - zoneCyPx * scale;

      const clipPath =
        zone.type === 'polygon' && zone.points
          ? `polygon(${zone.points.map((p) => `${p.x}% ${p.y}%`).join(', ')})`
          : `inset(${zone.y}% ${100 - ((zone.x || 0) + (zone.width || 0))}% ${100 - ((zone.y || 0) + (zone.height || 0))}% ${zone.x || 0}%)`;

      cropDiv = (
        <motion.div
          className="absolute"
          style={{ width: dims.imgW * scale, height: dims.imgH * scale, left, top }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <img
            src={getResizedImageUrl(product.frontImage, 400)}
            alt={product.name}
            className="w-full h-full"
            style={{ clipPath, objectFit: 'cover' }}
            loading="lazy"
            decoding="async"
          />
        </motion.div>
      );
    } else {
      // --- NON-CROPPED PRODUCT: show full image naturally ---
      cropDiv = (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <img
            src={getResizedImageUrl(product.frontImage, 400)}
            alt={product.name}
            className="max-w-full max-h-full w-auto h-auto object-contain"
            loading="lazy"
            decoding="async"
          />
        </motion.div>
      );
    }
  }

  // Mouse position for 3D tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring-based rotation
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), {
    stiffness: 300,
    damping: 30,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isSelected || soldOut) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onClick={soldOut ? undefined : onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 24,
        delay: index * 0.06,
      }}
      whileHover={!isSelected && !soldOut ? { scale: 1.04, z: 20 } : {}}
      whileTap={soldOut ? {} : { scale: 0.96 }}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: 600,
      }}
      className={`relative bg-cardstock rounded-2xl p-4 transition-shadow duration-300 ${
        soldOut
          ? 'cursor-not-allowed shadow-soft'
          : `cursor-pointer ${
              isSelected
                ? 'ring-2 ring-craft-mint shadow-paper'
                : 'shadow-soft hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]'
            }`
      }`}
    >
      {/* Hover sparkle */}
      {!isSelected && !soldOut && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="absolute -top-2 -right-2 w-7 h-7 bg-craft-mint/20 rounded-full flex items-center justify-center shadow-sm z-10"
        >
          <Sparkles className="w-3.5 h-3.5 text-craft-mint" />
        </motion.div>
      )}

      {/* Product image — measured + positioned crop */}
      <motion.div
        ref={wrapperRef}
        className="relative w-full h-24 mb-3 overflow-hidden"
        style={{
          transform: 'translateZ(30px)',
          filter: soldOut ? 'grayscale(1)' : undefined,
          opacity: soldOut ? 0.5 : 1,
        }}
      >
        {/* Hidden image for measurement */}
        <img
          ref={measureImgRef}
          src={product.frontImage}
          alt=""
          aria-hidden="true"
          className="absolute opacity-0 pointer-events-none"
          style={{ width: 0, height: 0 }}
        />
        {/* Visible crop */}
        {cropDiv}
      </motion.div>

      {/* Text */}
      <div style={{ transform: 'translateZ(20px)' }}>
        <p className="text-sm font-semibold text-center text-ink">{product.name}</p>
        <motion.p
          className="text-sm text-center text-craft-mint font-bold"
          animate={isSelected ? { scale: 1.1 } : { scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          {formatPrice(product.basePrice)}
        </motion.p>
      </div>

      {/* Low-stock badge */}
      {lowStock && (
        <span className="absolute top-2 left-2 z-20 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          Selling out · {product.quantity} left
        </span>
      )}

      {/* Sold-out stamp */}
      {soldOut && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <span className="rotate-[-12deg] border-[2.5px] border-craft-pink text-craft-pink bg-white/85 font-heading font-bold text-sm px-4 py-1.5 rounded-md tracking-widest shadow-paper">
            SOLD OUT
          </span>
        </div>
      )}
    </motion.div>
  );
}
