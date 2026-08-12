import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Check, AlertCircle, Loader2 } from 'lucide-react';
import { storage, db, supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import type { Patch } from '../AdminPanel';

interface PatchCaptureProps {
  onPatchSaved?: (patch: Patch) => void;
}

const categories = ['food', 'characters', 'letters', 'symbols'];

export function PatchCapture({ onPatchSaved }: PatchCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [capturedUrl, setCapturedUrl] = useState<string>('');
  const [processedUrl, setProcessedUrl] = useState<string>('');
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [threshold, setThreshold] = useState(240);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('3');
  const [quantity, setQuantity] = useState('50');
  const [category, setCategory] = useState('food');
  const [width, setWidth] = useState('80');
  const [height, setHeight] = useState('80');

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    setCameraError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access and reload.'
          : 'Could not access camera. Make sure you are on HTTPS and your device has a camera.'
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
  };

  // Auto-crop: detect content pixels on light/white background, make background transparent
  const processImage = useCallback(
    async (imageUrl: string): Promise<{ blob: Blob; url: string; bbox: { x: number; y: number; w: number; h: number } } | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const fullCanvas = document.createElement('canvas');
          fullCanvas.width = img.naturalWidth;
          fullCanvas.height = img.naturalHeight;
          const fullCtx = fullCanvas.getContext('2d');
          if (!fullCtx) return resolve(null);

          fullCtx.drawImage(img, 0, 0);
          const imageData = fullCtx.getImageData(0, 0, fullCanvas.width, fullCanvas.height);
          const data = imageData.data;
          const w = fullCanvas.width;
          const h = fullCanvas.height;

          let minX = w;
          let minY = h;
          let maxX = 0;
          let maxY = 0;

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const i = (y * w + x) * 4;
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const a = data[i + 3];
              const brightness = (r + g + b) / 3;
              // Treat bright/light as background; also fully transparent
              if (a > 20 && brightness < threshold) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
              }
            }
          }

          // Add padding
          const padding = Math.max(10, Math.round(Math.max(w, h) * 0.02));
          minX = Math.max(0, minX - padding);
          minY = Math.max(0, minY - padding);
          maxX = Math.min(w, maxX + padding);
          maxY = Math.min(h, maxY + padding);

          if (minX >= maxX || minY >= maxY) {
            return resolve(null);
          }

          const cropW = maxX - minX;
          const cropH = maxY - minY;

          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = cropW;
          cropCanvas.height = cropH;
          const cropCtx = cropCanvas.getContext('2d');
          if (!cropCtx) return resolve(null);

          const cropImageData = cropCtx.createImageData(cropW, cropH);
          const cropData = cropImageData.data;

          for (let y = minY; y < maxY; y++) {
            for (let x = minX; x < maxX; x++) {
              const srcI = (y * w + x) * 4;
              const dstI = ((y - minY) * cropW + (x - minX)) * 4;
              const r = data[srcI];
              const g = data[srcI + 1];
              const b = data[srcI + 2];
              const a = data[srcI + 3];
              const brightness = (r + g + b) / 3;

              if (a > 20 && brightness < threshold) {
                cropData[dstI] = r;
                cropData[dstI + 1] = g;
                cropData[dstI + 2] = b;
                cropData[dstI + 3] = a;
              } else {
                cropData[dstI] = 0;
                cropData[dstI + 1] = 0;
                cropData[dstI + 2] = 0;
                cropData[dstI + 3] = 0;
              }
            }
          }

          cropCtx.putImageData(cropImageData, 0, 0);

          cropCanvas.toBlob((blob) => {
            if (!blob) return resolve(null);
            resolve({
              blob,
              url: URL.createObjectURL(blob),
              bbox: { x: minX, y: minY, w: cropW, h: cropH },
            });
          }, 'image/png');
        };
        img.onerror = () => resolve(null);
        img.src = imageUrl;
      });
    },
    [threshold]
  );

  const handleSnap = async () => {
    if (!videoRef.current || !stream) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawUrl = canvas.toDataURL('image/png');
    setCapturedUrl(rawUrl);
    setIsProcessing(true);
    setProcessedUrl('');
    setCroppedBlob(null);
    setSaved(false);

    const result = await processImage(rawUrl);
    if (result) {
      setProcessedUrl(result.url);
      setCroppedBlob(result.blob);
    } else {
      // Fallback: use full image without cropping
      const res = await fetch(rawUrl);
      const blob = await res.blob();
      setProcessedUrl(rawUrl);
      setCroppedBlob(blob);
    }
    setIsProcessing(false);
  };

  const handleSave = async () => {
    if (!croppedBlob || !name.trim()) return;
    setIsUploading(true);
    try {
      const id = uuidv4();
      const fileName = `${id}.png`;
      const imageUrl = await storage.upload('patches', fileName, croppedBlob);

      const newPatch: Patch = {
        id,
        name: name.trim(),
        category,
        image: imageUrl,
        price: Number(price) || 0,
        quantity: Number(quantity) || 0,
        width: Number(width) || 80,
        height: Number(height) || 80,
        contentZone: { x: 0, y: 0, width: 100, height: 100, type: 'rectangle' },
      };

      const dbPatch = {
        id: newPatch.id,
        name: newPatch.name,
        category: newPatch.category,
        image_url: newPatch.image,
        price: newPatch.price,
        quantity: newPatch.quantity,
        width: newPatch.width,
        height: newPatch.height,
        content_zone: newPatch.contentZone,
        sort_order: Date.now(),
      };

      const { error } = await db.patches.upsert(dbPatch);
      if (error) throw error;

      // Refresh CDN export in background
      supabase.functions.invoke('export-products-patches', { body: {} }).catch((err) => {
        console.warn('Export failed:', err);
      });

      if (onPatchSaved) onPatchSaved(newPatch);

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        handleReset();
      }, 1200);
    } catch (err: any) {
      console.error('Failed to save patch:', err);
      alert('Failed to save patch: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    if (processedUrl && processedUrl !== capturedUrl) {
      URL.revokeObjectURL(processedUrl);
    }
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
    }
    setCapturedUrl('');
    setProcessedUrl('');
    setCroppedBlob(null);
    setName('');
    setPrice('3');
    setQuantity('50');
    setCategory('food');
    setWidth('80');
    setHeight('80');
  };

  const previewUrl = processedUrl || capturedUrl;

  return (
    <div className="space-y-4">
      {/* Camera preview */}
      {!capturedUrl && (
        <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3] shadow-soft">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-cardstock">
              <AlertCircle className="w-10 h-10 text-craft-rose mb-3" />
              <p className="text-sm text-ink/80 mb-4">{cameraError}</p>
              <button onClick={startCamera} className="btn-primary text-sm">Retry Camera</button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!stream && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
              <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                <button
                  onClick={handleSnap}
                  disabled={!stream || isProcessing}
                  className="w-16 h-16 rounded-full bg-white border-4 border-white/30 shadow-lg flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
                >
                  <div className="w-12 h-12 rounded-full bg-craft-mint" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Captured preview */}
      {capturedUrl && (
        <div className="space-y-4">
          <div className="bg-cardstock rounded-2xl p-3 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-lg font-bold text-ink">Captured Patch</h3>
              <button onClick={handleReset} className="text-xs text-ink/60 hover:text-ink flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Retake
              </button>
            </div>
            <div className="relative bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjBmMGYwIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNmMGYwZjAiLz48cmVjdCB4PSIxMCIgeT0iMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTBlMGUwIi8+PHJlY3QgeD0iMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI2UwZTBlMCIvPjwvc3ZnPg==')] rounded-xl overflow-hidden border border-ink/10 flex items-center justify-center" style={{ minHeight: '200px' }}>
              {isProcessing ? (
                <div className="py-12 flex flex-col items-center text-ink/60">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p className="text-sm">Cropping patch...</p>
                </div>
              ) : previewUrl ? (
                <img src={previewUrl} alt="Patch preview" className="max-w-full max-h-64 object-contain p-4" />
              ) : null}
            </div>
            {!isProcessing && (
              <div className="mt-3">
                <label className="text-xs font-semibold text-ink/70 mb-1 block">Background brightness cutoff</label>
                <input
                  type="range"
                  min="180"
                  max="250"
                  value={threshold}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setThreshold(val);
                    if (capturedUrl) {
                      setIsProcessing(true);
                      processImage(capturedUrl).then((result) => {
                        if (result) {
                          if (processedUrl && processedUrl !== capturedUrl) URL.revokeObjectURL(processedUrl);
                          setProcessedUrl(result.url);
                          setCroppedBlob(result.blob);
                        }
                        setIsProcessing(false);
                      });
                    }
                  }}
                  className="w-full accent-craft-mint"
                />
                <p className="text-[10px] text-ink/50 mt-1">Lower value = keep more shadows; higher = stricter white background removal</p>
              </div>
            )}
          </div>

          {/* Patch details form */}
          {!isProcessing && (
            <div className="bg-cardstock rounded-2xl p-4 shadow-soft space-y-4">
              <h3 className="font-heading text-lg font-bold text-ink">Patch Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-ink/70 block mb-1">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Strawberry"
                    className="w-full px-3 py-2 rounded-xl border border-ink/10 focus:border-craft-mint outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink/70 block mb-1">Price</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-ink/10 focus:border-craft-mint outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink/70 block mb-1">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-ink/10 focus:border-craft-mint outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink/70 block mb-1">Width (mm)</label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-ink/10 focus:border-craft-mint outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink/70 block mb-1">Height (mm)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-ink/10 focus:border-craft-mint outline-none text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-ink/70 block mb-1">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                          category === cat
                            ? 'bg-craft-mint text-white'
                            : 'bg-paper text-ink hover:bg-craft-mint/10'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={!croppedBlob || !name.trim() || isUploading}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : saved ? (
                  <><Check className="w-4 h-4" /> Saved!</>
                ) : (
                  <><Camera className="w-4 h-4" /> Save Patch</>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PatchCapture;
