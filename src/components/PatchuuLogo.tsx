/**
 * PatchuuLogo
 *
 * Renders the original Patchuu logo image with optional bubbly / sticker
 * wrapping to hide the white background and give a hand-crafted badge feel.
 *
 * - PatchuuLogo      : raw original logo image
 * - PatchuuLogoBlob  : original logo inside a puffy sticker/blob shape
 */

interface PatchuuLogoProps {
  height?: number;
  className?: string;
  /** Path to the original logo PNG */
  src?: string;
}

export function PatchuuLogo({
  height = 48,
  className = '',
  src = '/hero/patchuubg.png',
}: PatchuuLogoProps) {
  return (
    <img
      src={src}
      alt="Patchuu"
      height={height}
      className={`h-auto w-auto object-contain ${className}`}
      style={{ height }}
      draggable={false}
    />
  );
}

/**
 * PatchuuLogoBlob
 *
 * Wraps the original logo in a white bubbly sticker with a thick ink outline.
 * The white background of the PNG blends into the sticker so the square edges
 * disappear — giving the cute puffy label look from the reference image.
 */
export function PatchuuLogoBlob({
  height = 48,
  className = '',
  src = '/hero/patchuubg.png',
}: PatchuuLogoProps) {
  return (
    <svg
      viewBox="0 0 220 80"
      height={height}
      className={`drop-shadow-md ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── Puffy white background blob ── */}
      <path
        d="M16 28
           C20 14, 55 10, 85 12
           C115 8, 155 10, 185 16
           C208 20, 214 36, 210 50
           C206 66, 178 72, 148 70
           C118 74, 78 72, 48 68
           C22 64, 10 46, 16 28Z"
        fill="#ffffff"
        stroke="#2d2d2d"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── Inner wobble outline for hand-drawn feel ── */}
      <path
        d="M20 30
           C24 18, 56 14, 84 16
           C114 12, 152 14, 180 20
           C200 24, 206 38, 202 50
           C198 62, 172 66, 144 64
           C116 68, 78 66, 50 62
           C28 58, 16 42, 20 30Z"
        fill="none"
        stroke="#2d2d2d"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.10"
      />

      {/* ── Optional: larger faint duplicate behind for extra "bubbly" depth ── */}
      <image
        href={src}
        x="38"
        y="12"
        width="148"
        height="40"
        opacity="0.08"
        preserveAspectRatio="xMidYMid meet"
      />

      {/* ── Main original logo on top ── */}
      <image
        href={src}
        x="30"
        y="16"
        width="160"
        height="44"
        preserveAspectRatio="xMidYMid meet"
      />
    </svg>
  );
}
