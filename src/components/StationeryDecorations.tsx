/**
 * StationeryDecorations
 *
 * Floating scrapbook decorations that can be placed absolutely around the UI.
 * All components are SVG-based and fully scalable.
 */

interface DecoProps {
  className?: string;
  size?: number;
}

/* ── Doodle Stars ── */
export function DoodleStar({ className = '', size = 24 }: DecoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2L14 9L21 9L15 13L17 20L12 16L7 20L9 13L3 9L10 9Z"
        fill="#ffd54f"
        stroke="#2d2d2d"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DoodleSparkle({ className = '', size = 20 }: DecoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M10 0V20M0 10H20" stroke="#ffd54f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M3 3L17 17M17 3L3 17" stroke="#ffd54f" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/* ── Doodle Hearts ── */
export function DoodleHeart({ className = '', size = 24 }: DecoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="#f48fb1"
        stroke="#2d2d2d"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Scribble Circle ── */
export function ScribbleCircle({ className = '', size = 32 }: DecoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="12" stroke="#2d2d2d" strokeWidth="2" strokeDasharray="4 3" fill="none" />
      <circle cx="16" cy="16" r="8" stroke="#81c784" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/* ── Arrow Doodle ── */
export function DoodleArrow({ className = '', size = 32 }: DecoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M6 16H26M26 16L20 10M26 16L20 22" stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Scribble Underline ── */
export function ScribbleUnderline({ className = '', size = 80 }: DecoProps) {
  return (
    <svg width={size} height={12} viewBox="0 0 80 12" fill="none" className={className}>
      <path d="M2 8C15 3 30 10 40 6C50 2 65 9 78 4" stroke="#81c784" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* ── Checkmark Doodle ── */
export function DoodleCheck({ className = '', size = 28 }: DecoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className}>
      <circle cx="14" cy="14" r="12" fill="#e8f5e9" stroke="#2d2d2d" strokeWidth="2" />
      <path d="M8 14L12 18L20 10" stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Floating Decoration Cluster ── */
export function FloatingDecorations({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      <DoodleStar className="absolute top-[8%] left-[5%] opacity-60 animate-[float_4s_ease-in-out_infinite]" size={20} />
      <DoodleHeart className="absolute top-[15%] right-[8%] opacity-50 animate-[float-delayed_5s_ease-in-out_infinite]" size={18} />
      <ScribbleCircle className="absolute top-[25%] left-[12%] opacity-40 animate-[float_6s_ease-in-out_infinite]" size={28} />
      <DoodleSparkle className="absolute top-[10%] right-[20%] opacity-50 animate-[float_3.5s_ease-in-out_infinite]" size={16} />
      <DoodleStar className="absolute bottom-[20%] left-[8%] opacity-40 animate-[float-delayed_4.5s_ease-in-out_infinite]" size={16} />
      <DoodleHeart className="absolute bottom-[15%] right-[12%] opacity-50 animate-[float_5s_ease-in-out_infinite]" size={20} />
      <ScribbleCircle className="absolute bottom-[25%] right-[5%] opacity-40 animate-[float-delayed_6s_ease-in-out_infinite]" size={24} />
    </div>
  );
}
