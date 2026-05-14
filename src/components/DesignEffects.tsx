/**
 * DesignEffects.tsx
 *
 * Reusable visual effect components for the product customization flow:
 * step transitions, particle bursts, floating decorations, and glow effects.
 */

import { useEffect, useState, useMemo } from 'react';


// ─────────────────────────────────────────────────────────────
//  Step Transition (Step 1 → Step 2)
// ─────────────────────────────────────────────────────────────

interface StepTransitionProps {
  show: boolean;
  productImage: string;
  productName: string;
  placementZone: { type: 'polygon'; points: { x: number; y: number }[] } | { x?: number; y?: number; width?: number; height?: number } | null | undefined;
  onComplete: () => void;
}

type TransitionPhase = 'enter' | 'hold' | 'exit';

function getTransitionStyles(
  zone: StepTransitionProps['placementZone'],
  imgW: number,
  imgH: number
): { clipPath: string; left: number; top: number; wrapperWidth: number; wrapperHeight: number; size: number } {
  if (!zone) {
    return { clipPath: 'none', left: 0, top: 0, wrapperWidth: imgW, wrapperHeight: imgH, size: 240 };
  }

  let cx: number, cy: number, zw: number, zh: number;
  let clipPath: string;

  if ('points' in zone && zone.points && zone.points.length > 0) {
    clipPath = `polygon(${zone.points.map((p) => `${p.x}% ${p.y}%`).join(', ')})`;
    const xs = zone.points.map((p) => p.x);
    const ys = zone.points.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    zw = maxX - minX;
    zh = maxY - minY;
    cx = (minX + maxX) / 2;
    cy = (minY + maxY) / 2;
  } else {
    const z = zone as { x?: number; y?: number; width?: number; height?: number };
    zw = z.width || 100;
    zh = z.height || 100;
    cx = (z.x || 0) + zw / 2;
    cy = (z.y || 0) + zh / 2;
    clipPath = `inset(${z.y}% ${100 - ((z.x || 0) + (z.width || 0))}% ${100 - ((z.y || 0) + (z.height || 0))}% ${z.x || 0}%)`;
  }

  // Container size based on zone (preserves original visual behaviour)
  const zoneMin = Math.min(zw, zh) || 1;
  const containerScale = Math.min(Math.max(180 / (5 * zoneMin), 0.8), 5);
  const size = Math.min(Math.round(220 * Math.max(containerScale, 1)), 300);

  // Compute pixel values using ACTUAL image dimensions
  const zoneCxPx = (cx / 100) * imgW;
  const zoneCyPx = (cy / 100) * imgH;
  const zoneWPx = (zw / 100) * imgW;
  const zoneHPx = (zh / 100) * imgH;

  // Scale so zone fills the container with padding
  const padding = 0.85;
  const scale = Math.min(
    (size * padding) / Math.max(zoneWPx, 1),
    (size * padding) / Math.max(zoneHPx, 1)
  );

  const left = size / 2 - zoneCxPx * scale;
  const top = size / 2 - zoneCyPx * scale;

  return {
    clipPath,
    left,
    top,
    wrapperWidth: imgW * scale,
    wrapperHeight: imgH * scale,
    size,
  };
}

export function StepTransition({ show, productImage, productName, placementZone, onComplete }: StepTransitionProps) {
  const [phase, setPhase] = useState<TransitionPhase>('enter');
  const [imgDims, setImgDims] = useState<{ imgW: number; imgH: number }>({ imgW: 500, imgH: 500 });

  useEffect(() => {
    if (!show) return;
    setPhase('enter');
    const t1 = setTimeout(() => setPhase('hold'), 450);
    const t2 = setTimeout(() => setPhase('exit'), 1100);
    const t3 = setTimeout(() => onComplete(), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [show, onComplete]);

  // Measure actual image dimensions
  useEffect(() => {
    if (!show) return;
    const img = new Image();
    img.onload = () => setImgDims({ imgW: img.naturalWidth, imgH: img.naturalHeight });
    img.onerror = () => setImgDims({ imgW: 500, imgH: 500 });
    img.src = productImage;
  }, [show, productImage]);

  const styles = useMemo(() => getTransitionStyles(placementZone, imgDims.imgW, imgDims.imgH), [placementZone, imgDims]);

  if (!show) return null;

  const isEnter = phase === 'enter';
  const isHold = phase === 'hold';
  const isExit = phase === 'exit';

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center pointer-events-none"
      style={{
        opacity: isExit ? 0 : 1,
        transition: 'opacity 0.45s ease-out',
      }}
    >
      {/* Dark backdrop */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: 'rgba(0,0,0,0.45)',
          opacity: isEnter ? 0 : isHold ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      />

      {/* Radial burst */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: isEnter ? '10px' : '250vmax',
          height: isEnter ? '10px' : '250vmax',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(129,199,132,0.8) 0%, rgba(255,213,79,0.5) 40%, transparent 70%)',
          transition: 'width 0.6s cubic-bezier(0.22, 1, 0.36, 1), height 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />

      {/* Product image — centred and cropped (matches ProductCard) */}
      <div
        className="relative z-10 overflow-hidden rounded-2xl bg-white/10"
        style={{
          width: styles.size,
          height: styles.size,
          transform: isEnter
            ? 'scale(0.3)'
            : isExit
              ? 'scale(1.1)'
              : 'scale(1)',
          opacity: isEnter ? 0 : 1,
          transition: 'transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease',
        }}
      >
        <div
          className="absolute"
          style={{
            width: styles.wrapperWidth,
            height: styles.wrapperHeight,
            left: styles.left,
            top: styles.top,
          }}
        >
          <img
            src={productImage}
            alt={productName}
            className="w-full h-full"
            style={{ clipPath: styles.clipPath, objectFit: 'cover' }}
          />
        </div>
      </div>

      {/* Text */}
      <div
        className="relative z-10 mt-4 text-center px-6"
        style={{
          opacity: isEnter ? 0 : isHold ? 1 : 0,
          transform: isEnter ? 'translateY(16px)' : 'translateY(0)',
          transition: 'opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s',
        }}
      >
        <p className="font-heading text-xl sm:text-2xl font-bold text-white"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
        >
          Let&apos;s get creative! ✨
        </p>
        <p className="text-white/90 text-sm mt-1"
          style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}
        >
          {productName} is ready for your magic
        </p>
      </div>

      {/* Curtain wipe */}
      {isExit && (
        <div
          className="absolute inset-0 bg-paper"
          style={{
            clipPath: 'circle(0% at 50% 50%)',
            animation: 'curtain-reveal 0.5s ease-out forwards',
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Patch Burst Particles
// ─────────────────────────────────────────────────────────────

interface BurstParticle {
  id: string;
  x: number;
  y: number;
}

interface PatchBurstProps {
  bursts: BurstParticle[];
  onBurstEnd: (id: string) => void;
}

const burstColors = ['#81c784', '#ffd54f', '#f06292', '#64b5f6', '#ba68c8', '#ff8a65'];

export function PatchBurst({ bursts, onBurstEnd }: PatchBurstProps) {
  return (
    <>
      {bursts.map((burst) => (
        <PatchBurstItem key={burst.id} burst={burst} onEnd={() => onBurstEnd(burst.id)} />
      ))}
    </>
  );
}

function PatchBurstItem({ burst, onEnd }: { burst: BurstParticle; onEnd: () => void }) {
  useEffect(() => {
    const t = setTimeout(onEnd, 700);
    return () => clearTimeout(t);
  }, [onEnd]);

  const particles = useMemo(() => {
    // Deterministic pseudo-random for stable renders (seeded by index)
    const pr = (seed: number) => {
      const x = Math.sin(seed * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({ length: 8 }).map((_, i) => {
      const angle = (i / 8) * Math.PI * 2 + (pr(i) - 0.5) * 0.5;
      const dist = 30 + pr(i + 100) * 40;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      const color = burstColors[i % burstColors.length];
      const size = 4 + pr(i + 200) * 4;
      const delay = pr(i + 300) * 50;
      return { tx, ty, color, size, delay };
    });
  }, []);

  return (
    <>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: burst.x,
            top: burst.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `particle-burst 0.6s ${p.delay}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
            ['--tx' as string]: `${p.tx}px`,
            ['--ty' as string]: `${p.ty}px`,
          }}
        />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
//  Floating Creative Decorations (Canvas Background)
// ─────────────────────────────────────────────────────────────

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function FloatingDecorations() {
  if (prefersReducedMotion()) return null;

  const shapes = [
    { emoji: '✦', left: '8%', top: '15%', delay: '0s', duration: '6s', size: 'text-sm' },
    { emoji: '✧', left: '85%', top: '25%', delay: '1.5s', duration: '7s', size: 'text-xs' },
    { emoji: '❋', left: '12%', top: '70%', delay: '3s', duration: '8s', size: 'text-xs' },
    { emoji: '✦', left: '90%', top: '60%', delay: '0.8s', duration: '6.5s', size: 'text-sm' },
    { emoji: '✧', left: '50%', top: '10%', delay: '2.2s', duration: '9s', size: 'text-xs' },
    { emoji: '❋', left: '75%', top: '85%', delay: '4s', duration: '7.5s', size: 'text-xs' },
    { emoji: '✦', left: '25%', top: '90%', delay: '1s', duration: '8s', size: 'text-xs' },
    { emoji: '✧', left: '65%', top: '40%', delay: '3.5s', duration: '6s', size: 'text-sm' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {shapes.map((s, i) => (
        <span
          key={i}
          className={`absolute ${s.size} select-none`}
          style={{
            left: s.left,
            top: s.top,
            opacity: 0.12,
            color: '#81c784',
            animation: `float-decoration ${s.duration} ${s.delay} ease-in-out infinite`,
          }}
        >
          {s.emoji}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Fresh Patch Glow Ring
// ─────────────────────────────────────────────────────────────

interface FreshPatchGlowProps {
  active: boolean;
}

export function FreshPatchGlow({ active }: FreshPatchGlowProps) {
  if (!active) return null;
  return (
    <div
      className="absolute inset-0 pointer-events-none rounded-full"
      style={{
        animation: 'fresh-patch-pulse 0.8s ease-out forwards',
        border: '2px solid rgba(129, 199, 132, 0.6)',
        transform: 'scale(1.2)',
      }}
    />
  );
}
