import { useState, useRef, useEffect, useCallback } from 'react';
import { Paintbrush, Eraser, Undo2, Loader2, Check, X, Square, Hexagon } from 'lucide-react';

interface MaskEditorProps {
  /** The processed crop (with transparency). */
  imageUrl: string;
  /** The SAME crop before background removal. Restore tools copy pixels from
   *  here — canvas stores are premultiplied, so transparent pixels in
   *  `imageUrl` carry no usable colour of their own. Must have the same
   *  dimensions as imageUrl. Falls back to imageUrl when omitted. */
  originalUrl?: string;
  title?: string;
  onSave: (blob: Blob, url: string) => void;
  onCancel: () => void;
}

type Tool = 'brush' | 'rect' | 'poly';
type Pt = { x: number; y: number };

/**
 * Manual mask touch-up for camera captures. Brush, rectangle and polygon tools,
 * each in Restore (bring back wrongly removed pixels) or Erase (remove wrongly
 * kept pixels) mode. The mask is a full-resolution canvas; the preview shows
 * the masked result over a faint copy of the original for context.
 */
export function MaskEditor({ imageUrl, originalUrl, title = 'Touch Up Edges', onSave, onCancel }: MaskEditorProps) {
  const displayRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const origRef = useRef<HTMLImageElement | null>(null);
  const scaleRef = useRef(1);
  const paintingRef = useRef(false);

  const [mode, setMode] = useState<'restore' | 'erase'>('restore');
  const [tool, setTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(30);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cursor, setCursor] = useState<Pt | null>(null);

  // Shape state (display-pixel coords)
  const rectStartRef = useRef<Pt | null>(null);
  const [rectPreview, setRectPreview] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [polyPoints, setPolyPoints] = useState<Pt[]>([]);

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  // Composite: masked result over a faint copy of the unkeyed original
  const redraw = useCallback(() => {
    const display = displayRef.current;
    const mask = maskCanvasRef.current;
    const img = imgRef.current;
    const orig = origRef.current;
    if (!display || !mask || !img) return;
    const ctx = display.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, display.width, display.height);
    ctx.globalAlpha = 0.25;
    ctx.drawImage(orig || img, 0, 0, display.width, display.height);
    ctx.globalAlpha = 1;

    const comp = document.createElement('canvas');
    comp.width = mask.width;
    comp.height = mask.height;
    const cctx = comp.getContext('2d');
    if (!cctx) return;
    cctx.drawImage(orig || img, 0, 0);
    cctx.globalCompositeOperation = 'destination-in';
    cctx.drawImage(mask, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(comp, 0, 0, display.width, display.height);
  }, []);

  // Shape live-preview on the overlay canvas
  useEffect(() => {
    const overlay = overlayRef.current;
    const display = displayRef.current;
    if (!overlay || !display) return;
    overlay.width = display.width;
    overlay.height = display.height;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.strokeStyle = mode === 'restore' ? '#34d399' : '#ef4444';
    ctx.fillStyle = mode === 'restore' ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)';
    ctx.lineWidth = 2;
    if (rectPreview) {
      const x = Math.min(rectPreview.x0, rectPreview.x1);
      const y = Math.min(rectPreview.y0, rectPreview.y1);
      const w = Math.abs(rectPreview.x1 - rectPreview.x0);
      const h = Math.abs(rectPreview.y1 - rectPreview.y0);
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    }
    if (polyPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(polyPoints[0].x, polyPoints[0].y);
      for (let i = 1; i < polyPoints.length; i++) ctx.lineTo(polyPoints[i].x, polyPoints[i].y);
      if (cursor) ctx.lineTo(cursor.x, cursor.y);
      ctx.stroke();
      for (const p of polyPoints) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [rectPreview, polyPoints, cursor, mode]);

  const initMask = useCallback((img: HTMLImageElement) => {
    const mask = document.createElement('canvas');
    mask.width = img.naturalWidth;
    mask.height = img.naturalHeight;
    const mctx = mask.getContext('2d');
    if (!mctx) return null;
    const tmp = document.createElement('canvas');
    tmp.width = img.naturalWidth;
    tmp.height = img.naturalHeight;
    const tctx = tmp.getContext('2d');
    if (!tctx) return null;
    tctx.drawImage(img, 0, 0);
    const src = tctx.getImageData(0, 0, tmp.width, tmp.height);
    const maskData = mctx.createImageData(tmp.width, tmp.height);
    for (let i = 0; i < src.data.length; i += 4) {
      const v = src.data[i + 3] > 128 ? 255 : 0;
      maskData.data[i] = maskData.data[i + 1] = maskData.data[i + 2] = v;
      maskData.data[i + 3] = 255;
    }
    mctx.putImageData(maskData, 0, 0);
    return mask;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setLoadError(false);
    setPolyPoints([]);
    setRectPreview(null);
    (async () => {
      try {
        const img = await loadImage(imageUrl);
        let orig: HTMLImageElement | null = null;
        if (originalUrl && originalUrl !== imageUrl) {
          try {
            const o = await loadImage(originalUrl);
            if (o.naturalWidth === img.naturalWidth && o.naturalHeight === img.naturalHeight) orig = o;
          } catch { /* fall back to imageUrl */ }
        }
        if (cancelled) return;
        imgRef.current = img;
        origRef.current = orig;

        const maxW = Math.min(720, window.innerWidth - 64);
        const maxH = Math.min(480, window.innerHeight * 0.55);
        const scale = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
        scaleRef.current = scale;

        const display = displayRef.current;
        if (!display) return;
        display.width = Math.max(1, Math.round(img.naturalWidth * scale));
        display.height = Math.max(1, Math.round(img.naturalHeight * scale));

        const mask = initMask(img);
        if (!mask) return;
        maskCanvasRef.current = mask;
        setReady(true);
        redraw();
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [imageUrl, originalUrl, redraw, initMask]);

  const fillColor = () => (mode === 'restore' ? '#ffffff' : '#000000');

  const paintAt = (pt: Pt) => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const s = scaleRef.current;
    const mctx = mask.getContext('2d');
    if (!mctx) return;
    mctx.fillStyle = fillColor();
    mctx.beginPath();
    mctx.arc(pt.x / s, pt.y / s, brushSize / 2 / s, 0, Math.PI * 2);
    mctx.fill();
    redraw();
  };

  const commitRect = (r: { x0: number; y0: number; x1: number; y1: number }) => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const s = scaleRef.current;
    const mctx = mask.getContext('2d');
    if (!mctx) return;
    mctx.fillStyle = fillColor();
    mctx.fillRect(
      Math.min(r.x0, r.x1) / s,
      Math.min(r.y0, r.y1) / s,
      Math.abs(r.x1 - r.x0) / s,
      Math.abs(r.y1 - r.y0) / s
    );
    redraw();
  };

  const commitPoly = useCallback((pts: Pt[]) => {
    const mask = maskCanvasRef.current;
    if (!mask || pts.length < 3) return;
    const s = scaleRef.current;
    const mctx = mask.getContext('2d');
    if (!mctx) return;
    mctx.fillStyle = fillColor();
    mctx.beginPath();
    mctx.moveTo(pts[0].x / s, pts[0].y / s);
    for (let i = 1; i < pts.length; i++) mctx.lineTo(pts[i].x / s, pts[i].y / s);
    mctx.closePath();
    mctx.fill();
    redraw();
  }, [mode, redraw]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polygon keyboard: Enter commits, Escape cancels
  useEffect(() => {
    if (tool !== 'poly') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        commitPoly(polyPoints);
        setPolyPoints([]);
      } else if (e.key === 'Escape') {
        setPolyPoints([]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tool, polyPoints, commitPoly]);

  const toLocal = (e: React.PointerEvent): Pt => {
    const rect = displayRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const pt = toLocal(e);
    if (tool === 'brush') {
      paintingRef.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      paintAt(pt);
    } else if (tool === 'rect') {
      rectStartRef.current = pt;
      setRectPreview({ x0: pt.x, y0: pt.y, x1: pt.x, y1: pt.y });
    } else {
      setPolyPoints((prev) => [...prev, pt]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const pt = toLocal(e);
    setCursor(pt);
    if (tool === 'brush' && paintingRef.current) paintAt(pt);
    if (tool === 'rect' && rectStartRef.current) {
      setRectPreview({ x0: rectStartRef.current.x, y0: rectStartRef.current.y, x1: pt.x, y1: pt.y });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (tool === 'brush') {
      paintingRef.current = false;
    } else if (tool === 'rect' && rectStartRef.current) {
      const pt = toLocal(e);
      const r = { x0: rectStartRef.current.x, y0: rectStartRef.current.y, x1: pt.x, y1: pt.y };
      rectStartRef.current = null;
      setRectPreview(null);
      if (Math.abs(r.x1 - r.x0) > 3 && Math.abs(r.y1 - r.y0) > 3) commitRect(r);
    }
  };

  const handleDoubleClick = () => {
    if (tool === 'poly' && polyPoints.length >= 3) {
      commitPoly(polyPoints);
      setPolyPoints([]);
    }
  };

  const switchTool = (t: Tool) => {
    setTool(t);
    setPolyPoints([]);
    setRectPreview(null);
    rectStartRef.current = null;
    paintingRef.current = false;
  };

  const handleReset = () => {
    const img = imgRef.current;
    if (!img) return;
    const mask = initMask(img);
    if (!mask) return;
    maskCanvasRef.current = mask;
    setPolyPoints([]);
    redraw();
  };

  const handleSave = () => {
    const mask = maskCanvasRef.current;
    const img = imgRef.current;
    const orig = origRef.current;
    if (!mask || !img || saving) return;
    setSaving(true);
    const out = document.createElement('canvas');
    out.width = img.naturalWidth;
    out.height = img.naturalHeight;
    const octx = out.getContext('2d');
    if (!octx) { setSaving(false); return; }
    // Colours come from the unkeyed original; the mask decides visibility
    octx.drawImage(orig || img, 0, 0);
    const outData = octx.getImageData(0, 0, out.width, out.height);
    const maskData = mask.getContext('2d')!.getImageData(0, 0, mask.width, mask.height);
    for (let i = 0; i < outData.data.length; i += 4) {
      outData.data[i + 3] = maskData.data[i] > 128 ? 255 : 0;
    }
    octx.putImageData(outData, 0, 0);
    out.toBlob((blob) => {
      setSaving(false);
      if (!blob) return;
      onSave(blob, URL.createObjectURL(blob));
    }, 'image/png');
  };

  const toolBtn = (t: Tool, label: string, Icon: typeof Paintbrush) => (
    <button
      onClick={() => switchTool(t)}
      className={`px-3 py-1.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors ${tool === t ? 'bg-ink text-white' : 'bg-paper text-ink/60 hover:text-ink'}`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 p-4" style={{ zIndex: 9999 }}>
      <div className="bg-cardstock rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg font-bold text-ink">{title}</h3>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-ink/50 hover:text-ink hover:bg-paper transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-ink/60">
          <strong>Restore</strong> brings back areas that were wrongly cut off; <strong>Erase</strong> removes leftover background.
          Use the brush for details, or drag a <strong>rectangle</strong> / click out a <strong>polygon</strong> (double-click or Enter to close, Esc to cancel) for big areas.
          The faint ghost shows the original photo for reference.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setMode('restore')}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors ${mode === 'restore' ? 'bg-craft-mint text-white' : 'bg-paper text-ink/60 hover:text-ink'}`}
          >
            <Paintbrush className="w-4 h-4" /> Restore
          </button>
          <button
            onClick={() => setMode('erase')}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors ${mode === 'erase' ? 'bg-red-500 text-white' : 'bg-paper text-ink/60 hover:text-ink'}`}
          >
            <Eraser className="w-4 h-4" /> Erase
          </button>
          <span className="w-px h-6 bg-ink/10 mx-1" />
          {toolBtn('brush', 'Brush', Paintbrush)}
          {toolBtn('rect', 'Rect', Square)}
          {toolBtn('poly', 'Polygon', Hexagon)}
          {tool === 'brush' && (
            <label className="flex items-center gap-2 text-xs text-ink/60 ml-1">
              Size
              <input
                type="range"
                min="10"
                max="120"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-24 accent-craft-mint"
              />
              {brushSize}px
            </label>
          )}
          <button
            onClick={handleReset}
            className="ml-auto px-3 py-1.5 rounded-xl text-sm font-semibold text-ink/60 hover:bg-paper transition-colors flex items-center gap-1.5"
          >
            <Undo2 className="w-4 h-4" /> Reset
          </button>
        </div>

        <div
          className="relative rounded-xl overflow-hidden border border-ink/10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjBmMGYwIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNmMGYwZjAiLz48cmVjdCB4PSIxMCIgeT0iMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTBlMGUwIi8+PHJlY3QgeD0iMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI2UwZTBlMCIvPjwvc3ZnPg==')] flex items-center justify-center touch-none"
          style={{ minHeight: '200px' }}
        >
          {!ready && !loadError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-ink/40" />
            </div>
          )}
          {loadError && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-ink/60 px-4 text-center">
              Couldn&apos;t load the captured image — close this and capture again.
            </div>
          )}
          <div className="relative" style={{ cursor: tool === 'brush' ? 'none' : 'crosshair' }}>
            <canvas
              ref={displayRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={() => { paintingRef.current = false; setCursor(null); }}
              onDoubleClick={handleDoubleClick}
              className="max-w-full block"
              style={{ touchAction: 'none' }}
            />
            <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            {cursor && ready && tool === 'brush' && (
              <div
                className={`absolute rounded-full border-2 pointer-events-none ${mode === 'restore' ? 'border-craft-mint' : 'border-red-500'}`}
                style={{
                  left: cursor.x - brushSize / 2,
                  top: cursor.y - brushSize / 2,
                  width: brushSize,
                  height: brushSize,
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.7)',
                }}
              />
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!ready || saving}
            className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Apply Touch-Up
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-ink/60 hover:bg-paper transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default MaskEditor;
