import type { ReactNode } from 'react';

interface PaperCardProps {
  children: ReactNode;
  className?: string;
  color?: 'white' | 'yellow' | 'mint' | 'pink' | 'lavender' | 'blue' | 'peach';
  border?: 'hand' | 'hand-thick' | 'dashed' | 'none';
  shadow?: 'paper' | 'paper-lg' | 'none';
  rotation?: number;
  decoration?: 'binder-clip-green' | 'binder-clip-mint' | 'binder-clip-yellow' | 'binder-clip-pink' | 'paperclip' | 'tape-top' | 'tape-corner' | 'pin' | 'none';
}

const colorMap = {
  white: 'bg-cardstock',
  yellow: 'bg-cardstock-yellow',
  mint: 'bg-cardstock-mint',
  pink: 'bg-cardstock-pink',
  lavender: 'bg-cardstock-lavender',
  blue: 'bg-cardstock-blue',
  peach: 'bg-cardstock-peach',
};

const borderMap = {
  hand: 'border-[2.5px] border-ink rounded-[1.25rem]',
  'hand-thick': 'border-[3px] border-ink rounded-[1.5rem]',
  dashed: 'border-[2.5px] border-dashed border-ink rounded-[1.25rem]',
  none: '',
};

const shadowMap = {
  paper: 'shadow-paper',
  'paper-lg': 'shadow-paper-lg',
  none: '',
};

export function PaperCard({
  children,
  className = '',
  color = 'white',
  border = 'hand',
  shadow = 'paper',
  rotation = 0,
  decoration = 'none',
}: PaperCardProps) {
  const rotateStyle = rotation !== 0 ? { transform: `rotate(${rotation}deg)` } : undefined;

  return (
    <div className="relative inline-block" style={rotateStyle}>
      {/* Decoration layer */}
      {decoration !== 'none' && (
        <div className="absolute -top-3 -right-2 z-10 pointer-events-none">
          {decoration === 'binder-clip-green' && <BinderClip color="#81c784" />}
          {decoration === 'binder-clip-mint' && <BinderClip color="#a5d6a7" />}
          {decoration === 'binder-clip-yellow' && <BinderClip color="#ffd54f" />}
          {decoration === 'binder-clip-pink' && <BinderClip color="#f48fb1" />}
          {decoration === 'paperclip' && <PaperclipIcon />}
          {decoration === 'tape-top' && <WashiTape />}
          {decoration === 'tape-corner' && <WashiTapeCorner />}
          {decoration === 'pin' && <PushPin />}
        </div>
      )}

      <div
        className={[
          colorMap[color],
          borderMap[border],
          shadowMap[shadow],
          'transition-shadow duration-200',
          className,
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  );
}

/* ── SVG Stationery Decorations ── */

function BinderClip({ color }: { color: string }) {
  return (
    <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Wire loop */}
      <path
        d="M10 18C10 8 14 4 18 4C22 4 26 8 26 18V30H10V18Z"
        stroke="#2d2d2d"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Body */}
      <rect x="6" y="26" width="24" height="14" rx="3" fill={color} stroke="#2d2d2d" strokeWidth="2" />
      {/* Wire handles */}
      <path d="M12 26V22C12 18 14 16 18 16C22 16 24 18 24 22V26" stroke="#2d2d2d" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="28" height="44" viewBox="0 0 28 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 4C8 4 6 8 6 14V30C6 36 8 40 14 40C20 40 22 36 22 30V14"
        stroke="#8a8a8a"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WashiTape() {
  return (
    <svg width="80" height="24" viewBox="0 0 80 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="76" height="16" rx="2" fill="#ffd54f" fillOpacity="0.7" stroke="#2d2d2d" strokeWidth="1.5" strokeDasharray="4 3" />
    </svg>
  );
}

function WashiTapeCorner() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4L44 8L40 44L8 40Z" fill="#81c784" fillOpacity="0.6" stroke="#2d2d2d" strokeWidth="1.5" strokeDasharray="3 3" />
    </svg>
  );
}

function PushPin() {
  return (
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="12" r="10" fill="#f06292" stroke="#2d2d2d" strokeWidth="2" />
      <path d="M14 22V32" stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="14" cy="12" r="3" fill="white" fillOpacity="0.4" />
    </svg>
  );
}
