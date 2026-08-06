import { PatchuuLogo } from './PatchuuLogo';

export function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-6 px-4">
      <PatchuuLogo height={80} className="animate-pulse" />
      <div className="w-6 h-6 border-2 border-cardstock border-t-craft-mint rounded-full animate-spin" />
      <p className="text-ink-muted text-sm">Loading your creative space...</p>
    </div>
  );
}
