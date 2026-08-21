import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Camera, RefreshCw, Check, AlertCircle, Loader2, Crop, RotateCw, RotateCcw, Paintbrush, ZoomIn, ImageIcon } from 'lucide-react';
import { storage, db, supabase } from '../lib/supabase';
import { analyzeFrameLayered } from '../lib/objectDetect';
import { enhanceCapture, rotateImage90, whiteBalanceFromBackground, adjustImage } from '../lib/imageEnhance';
import { v4 as uuidv4 } from 'uuid';
import { ImageTracer } from '../ImageTracer';
import type { TracedZone } from '../ImageTracer';
import { MaskEditor } from './MaskEditor';
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

  // Content zone (trim) — defaults to the full cropped image, editable via ImageTracer
  const fullZone: TracedZone = { x: 0, y: 0, width: 100, height: 100, type: 'rectangle' };
  const [contentZone, setContentZone] = useState<TracedZone>(fullZone);
  const [showZoneEditor, setShowZoneEditor] = useState(false);
  // Picture zone — which part of the image customers see in the picker
  const [pictureZone, setPictureZone] = useState<TracedZone>(fullZone);
  const [showPictureEditor, setShowPictureEditor] = useState(false);
  const [showMaskEditor, setShowMaskEditor] = useState(false);
  // Unkeyed copy of the processed crop — restore source for the touch-up editor
  const [rawProcessedUrl, setRawProcessedUrl] = useState('');
  // Auto-processed image before manual colour tweaks — sliders regenerate from this
  const [processedBaseUrl, setProcessedBaseUrl] = useState('');
  const [baseBlob, setBaseBlob] = useState<Blob | null>(null);
  const [colorTemp, setColorTemp] = useState(0);
  const [colorTint, setColorTint] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [sharpness, setSharpness] = useState(0);
  // How many pixels of halo to trim from the cut-out edge (0 = off)
  const [edgeErode, setEdgeErode] = useState(1);
  // Digital zoom — crops the centre 1/zoom of the frame WITHOUT rescaling, so
  // absolute pixel scale (and therefore calibration) is unchanged at any zoom
  const [zoom, setZoom] = useState(1);

  // Camera calibration for real-world mm sizing
  interface Calibration {
    pixelsPerMm: number;
    refWidth: number;
    refHeight: number;
    capturedAt: number;
  }
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrationError, setCalibrationError] = useState('');
  const [calibrationPreview, setCalibrationPreview] = useState('');
  const [refWidth, setRefWidth] = useState('85.6');
  const [refHeight, setRefHeight] = useState('53.98');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('patchpress-camera-calibration');
      if (saved) setCalibration(JSON.parse(saved));
    } catch {
      // ignore corrupt calibration
    }
  }, []);

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
          // 'ideal' (not required) so virtual cameras (OBS/VDO.Ninja) are accepted;
          // 4K ideal so the browser never downscales what the device can provide
          facingMode: { ideal: 'environment' },
          width: { ideal: 3840 },
          height: { ideal: 2160 },
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

  // Re-attach the stream whenever the video element remounts (e.g. after Retake)
  const setVideoElement = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
    }
  };

  // Auto-crop: detect content pixels on light/white background, make background transparent
  const processImage = useCallback(
    async (imageUrl: string, thresholdValue: number, erodePx: number): Promise<{ blob: Blob; url: string; rawUrl: string; bbox: { x: number; y: number; w: number; h: number } } | null> => {
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

          // Detect the dominant object at full resolution (border-connected background
          // flood fill — see lib/objectDetect); the returned mask doubles as the
          // pixel-accurate keying mask for background removal
          const margin = 255 - thresholdValue;
          const detection = analyzeFrameLayered(data, w, h, margin);
          if (!detection.bbox) return resolve(null);

          const detMinX = detection.bbox.minX;
          const detMinY = detection.bbox.minY;
          const detMaxX = detection.bbox.maxX;
          const detMaxY = detection.bbox.maxY;

          // Small fixed padding around the crop — enough room for feathered edges
          // and drop shadows, but small enough that it barely affects the mm
          // measurement (which describes the saved image, see bbox below)
          const padding = 6;
          const minX = Math.max(0, detMinX - padding);
          const minY = Math.max(0, detMinY - padding);
          const maxX = Math.min(w, detMaxX + padding);
          const maxY = Math.min(h, detMaxY + padding);

          if (minX >= maxX || minY >= maxY) {
            return resolve(null);
          }

          const cropW = maxX - minX;
          const cropH = maxY - minY;

          // Unkeyed copy of the crop — the touch-up editor restores pixels from
          // it (canvas stores are premultiplied, so transparent pixels in the
          // keyed PNG carry no usable colour)
          const rawCanvas = document.createElement('canvas');
          rawCanvas.width = cropW;
          rawCanvas.height = cropH;
          const rawCtx = rawCanvas.getContext('2d');
          if (!rawCtx) return resolve(null);
          rawCtx.drawImage(img, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = cropW;
          cropCanvas.height = cropH;
          const cropCtx = cropCanvas.getContext('2d');
          if (!cropCtx) return resolve(null);

          const cropImageData = rawCtx.getImageData(0, 0, cropW, cropH);
          const cropData = cropImageData.data;

          // White-balance against the background BEFORE keying, and write the
          // corrected pixels back to the raw copy (the touch-up editor's
          // restore source) so restored areas match
          const bgMask = new Uint8Array(cropW * cropH);
          let bgCount = 0;
          for (let y = 0; y < cropH; y++) {
            for (let x = 0; x < cropW; x++) {
              if (detection.background[(y + minY) * w + (x + minX)] === 1) {
                bgMask[y * cropW + x] = 1;
                bgCount++;
              }
            }
          }
          if (bgCount > 100) {
            whiteBalanceFromBackground(cropImageData, bgMask);
            rawCtx.putImageData(cropImageData, 0, 0);
          }

          for (let y = 0; y < cropH; y++) {
            for (let x = 0; x < cropW; x++) {
              const i = (y * cropW + x) * 4;
              const isBgHere = detection.background[(y + minY) * w + (x + minX)] === 1;
              if (cropData[i + 3] <= 20 || isBgHere) {
                cropData[i + 3] = 0;
              }
            }
          }

          enhanceCapture(cropImageData, 0.35, erodePx);
          cropCtx.putImageData(cropImageData, 0, 0);

          cropCanvas.toBlob((blob) => {
            if (!blob) return resolve(null);
            rawCanvas.toBlob((rawBlob) => {
              if (!rawBlob) return resolve(null);
              resolve({
                blob,
                url: URL.createObjectURL(blob),
                rawUrl: URL.createObjectURL(rawBlob),
                // Measure the SAVED (padded) image, not the bare object: the
                // storefront sizes patches as mm-ratio × full image width, so
                // both patches and products must use the same convention or
                // padding makes patches render smaller than true scale
                bbox: { x: minX, y: minY, w: cropW, h: cropH },
              });
            }, 'image/png');
          }, 'image/png');
        };
        img.onerror = () => resolve(null);
        img.src = imageUrl;
      });
    },
    []
  );

  // Capture the current video frame, cropping to the centre 1/zoom when zoomed.
  // Crop-only (no upscaling) keeps absolute pixel scale identical, so
  // calibration stays valid no matter the zoom level.
  const snapZoomedFrame = (video: HTMLVideoElement, z: number): HTMLCanvasElement | null => {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const sw = Math.max(2, Math.round(vw / z));
    const sh = Math.max(2, Math.round(vh / z));
    const sx = Math.round((vw - sw) / 2);
    const sy = Math.round((vh - sh) / 2);
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    return canvas;
  };

  const handleSnap = async () => {
    if (!videoRef.current || !stream) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      alert('Camera is not ready yet. Wait a moment and try again.');
      return;
    }
    const canvas = snapZoomedFrame(video, zoom);
    if (!canvas) return;

    const rawUrl = canvas.toDataURL('image/png');
    setCapturedUrl(rawUrl);
    setIsProcessing(true);
    setProcessedUrl('');
    setRawProcessedUrl('');
    setCroppedBlob(null);
    setSaved(false);

    const result = await processImage(rawUrl, threshold, edgeErode);
    if (result) {
      setProcessedUrl(result.url);
      setRawProcessedUrl(result.rawUrl);
      setProcessedBaseUrl(result.url);
      setBaseBlob(result.blob);
      resetAdjustments();
      setCroppedBlob(result.blob);
      if (calibration) {
        setWidth(String(Math.round(result.bbox.w / calibration.pixelsPerMm)));
        setHeight(String(Math.round(result.bbox.h / calibration.pixelsPerMm)));
      } else {
        setWidth(String(result.bbox.w));
        setHeight(String(result.bbox.h));
      }
    } else {
      // Fallback: use full image without cropping
      const res = await fetch(rawUrl);
      const blob = await res.blob();
      setProcessedUrl(rawUrl);
      setProcessedBaseUrl(rawUrl);
      setBaseBlob(blob);
      resetAdjustments();
      setRawProcessedUrl(rawUrl);
      setCroppedBlob(blob);
      setWidth(String(canvas.width));
      setHeight(String(canvas.height));
    }
    setIsProcessing(false);
  };

  const handleCalibrate = async () => {
    if (!videoRef.current || !stream) return;
    setCalibrating(true);
    setCalibrationError('');
    setCalibrationPreview('');
    try {
      const video = videoRef.current;
      if (!video.videoWidth || !video.videoHeight) {
        setCalibrationError('Camera is not ready. Wait a moment and try again.');
        return;
      }
      // Run detection at full resolution (same pipeline as capture),
      // on the same zoom-cropped frame a capture would use
      const frameCanvas = snapZoomedFrame(video, zoom);
      if (!frameCanvas) return;
      const w = frameCanvas.width;
      const h = frameCanvas.height;
      const fctx = frameCanvas.getContext('2d');
      if (!fctx) return;
      const frameData = fctx.getImageData(0, 0, w, h).data;
      const detection = analyzeFrameLayered(frameData, w, h, 255 - threshold);

      // Preview: frame + green tint over detected object pixels (+ box on success),
      // so failures show exactly what was picked up
      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = w;
      previewCanvas.height = h;
      const pctx = previewCanvas.getContext('2d');
      if (pctx) {
        pctx.drawImage(frameCanvas, 0, 0);
        const oImg = pctx.createImageData(w, h);
        for (let i = 0; i < w * h; i++) {
          if (detection.background[i] === 0) {
            const p = i * 4;
            oImg.data[p] = 34;
            oImg.data[p + 1] = 197;
            oImg.data[p + 2] = 94;
            oImg.data[p + 3] = 90;
          }
        }
        // Tint via an offscreen canvas so the frame itself isn't clobbered
        const overlay = document.createElement('canvas');
        overlay.width = w;
        overlay.height = h;
        const octx = overlay.getContext('2d');
        if (octx) {
          octx.putImageData(oImg, 0, 0);
          pctx.drawImage(overlay, 0, 0);
        }
        if (detection.bbox) {
          pctx.strokeStyle = '#22c55e';
          pctx.lineWidth = Math.max(2, Math.round(w / 300));
          pctx.strokeRect(
            detection.bbox.minX,
            detection.bbox.minY,
            detection.bbox.maxX - detection.bbox.minX + 1,
            detection.bbox.maxY - detection.bbox.minY + 1
          );
        }
        setCalibrationPreview(previewCanvas.toDataURL('image/png'));
      }

      if (!detection.bbox) {
        setCalibrationError(
          detection.reason === 'edge-reject'
            ? 'The detected region (green tint) touches the frame edges — keep the object fully inside the frame with space around it.'
            : 'Nothing stood out from the background (green tint shows what was detected). Use a plain, untextured surface with visible contrast against the object, and avoid harsh shadows.'
        );
        return;
      }

      // Full-resolution pixels — matches how captures are measured
      const bboxWpx = detection.bbox.maxX - detection.bbox.minX + 1;
      const bboxHpx = detection.bbox.maxY - detection.bbox.minY + 1;
      const realW = Number(refWidth) || 1;
      const realH = Number(refHeight) || 1;
      const pixelsPerMm = (bboxWpx / realW + bboxHpx / realH) / 2;

      const newCalibration: Calibration = {
        pixelsPerMm,
        refWidth: realW,
        refHeight: realH,
        capturedAt: Date.now(),
      };
      setCalibration(newCalibration);
      localStorage.setItem('patchpress-camera-calibration', JSON.stringify(newCalibration));
    } finally {
      setCalibrating(false);
    }
  };

  // Manual calibration fallback: user draws the box around the reference object
  const [manualCalFrame, setManualCalFrame] = useState<{ url: string; w: number; h: number } | null>(null);

  const handleManualCalibrate = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCalibrationError('Camera is not ready. Wait a moment and try again.');
      return;
    }
    const canvas = snapZoomedFrame(video, zoom);
    if (!canvas) return;
    setCalibrationError('');
    setCalibrationPreview('');
    setManualCalFrame({ url: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height });
  };

  const handleManualZoneSave = (zone: TracedZone) => {
    const frame = manualCalFrame;
    setManualCalFrame(null);
    if (!frame) return;
    const pxW = (zone.width / 100) * frame.w;
    const pxH = (zone.height / 100) * frame.h;
    if (pxW < 5 || pxH < 5) {
      setCalibrationError('The drawn box is too small — draw it snugly around the reference object.');
      return;
    }
    const realW = Number(refWidth) || 1;
    const realH = Number(refHeight) || 1;
    const pixelsPerMm = (pxW / realW + pxH / realH) / 2;
    const newCalibration: Calibration = { pixelsPerMm, refWidth: realW, refHeight: realH, capturedAt: Date.now() };
    setCalibration(newCalibration);
    localStorage.setItem('patchpress-camera-calibration', JSON.stringify(newCalibration));

    // Show the measured box on the captured frame
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = frame.w;
      canvas.height = frame.h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = Math.max(2, Math.round(frame.w / 300));
      ctx.strokeRect((zone.x / 100) * frame.w, (zone.y / 100) * frame.h, pxW, pxH);
      setCalibrationPreview(canvas.toDataURL('image/png'));
    };
    img.src = frame.url;
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
        contentZone,
        cropZone: pictureZone,
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
        crop_zone: newPatch.cropZone,
        sort_order: 0,
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
    if (rawProcessedUrl && rawProcessedUrl !== capturedUrl && rawProcessedUrl.startsWith('blob:')) {
      URL.revokeObjectURL(rawProcessedUrl);
    }
    if (processedBaseUrl && processedBaseUrl !== capturedUrl && processedBaseUrl !== processedUrl && processedBaseUrl.startsWith('blob:')) {
      URL.revokeObjectURL(processedBaseUrl);
    }
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
    }
    setCapturedUrl('');
    setProcessedUrl('');
    setRawProcessedUrl('');
    setProcessedBaseUrl('');
    setBaseBlob(null);
    resetAdjustments();
    setCroppedBlob(null);
    setName('');
    setPrice('3');
    setQuantity('50');
    setCategory('food');
    setWidth('80');
    setHeight('80');
    setContentZone(fullZone);
    setPictureZone(fullZone);
    setShowZoneEditor(false);
  };

  // Rotate the captured (processed) image by ±90°; measurements swap axes
  const [isRotating, setIsRotating] = useState(false);
  const handleRotate = async (direction: 'cw' | 'ccw') => {
    if (!processedUrl || isRotating) return;
    setIsRotating(true);
    const rotated = await rotateImage90(processedUrl, direction);
    const rotatedRaw = rawProcessedUrl && rawProcessedUrl !== capturedUrl
      ? await rotateImage90(rawProcessedUrl, direction)
      : null;
    const rotatedBase = processedBaseUrl && processedBaseUrl !== processedUrl && processedBaseUrl !== capturedUrl
      ? await rotateImage90(processedBaseUrl, direction)
      : null;
    if (rotated) {
      if (processedUrl !== capturedUrl && processedUrl.startsWith('blob:')) URL.revokeObjectURL(processedUrl);
      setProcessedUrl(rotated.url);
      setCroppedBlob(rotated.blob);
      if (rotatedRaw) {
        if (rawProcessedUrl.startsWith('blob:')) URL.revokeObjectURL(rawProcessedUrl);
        setRawProcessedUrl(rotatedRaw.url);
      }
      if (rotatedBase) {
        if (processedBaseUrl.startsWith('blob:')) URL.revokeObjectURL(processedBaseUrl);
        setProcessedBaseUrl(rotatedBase.url);
        setBaseBlob(rotatedBase.blob);
      } else {
        // No separate base (no colour tweaks active) — the rotated image becomes the base
        setProcessedBaseUrl(rotated.url);
        setBaseBlob(rotated.blob);
      }
      setContentZone(fullZone);
      setPictureZone(fullZone);
      const w = width;
      setWidth(height);
      setHeight(w);
    }
    setIsRotating(false);
  };

  // Regenerate the visible image from the auto-processed base with manual
  // adjustments applied (all-zero = show the base unchanged)
  const resetAdjustments = () => {
    setColorTemp(0);
    setColorTint(0);
    setBrightness(0);
    setContrast(0);
    setSharpness(0);
  };

  const applyAdjustments = async (temp: number, tint: number, bright: number, contr: number, sharp: number) => {
    if (!processedBaseUrl) return;
    if (temp === 0 && tint === 0 && bright === 0 && contr === 0 && sharp === 0) {
      if (processedUrl !== processedBaseUrl && processedUrl.startsWith('blob:')) URL.revokeObjectURL(processedUrl);
      setProcessedUrl(processedBaseUrl);
      setCroppedBlob(baseBlob);
      return;
    }
    const adjusted = await adjustImage(processedBaseUrl, { temperature: temp, tint, brightness: bright, contrast: contr, sharpen: sharp });
    if (adjusted) {
      if (processedUrl !== processedBaseUrl && processedUrl.startsWith('blob:')) URL.revokeObjectURL(processedUrl);
      setProcessedUrl(adjusted.url);
      setCroppedBlob(adjusted.blob);
    }
  };

  const previewUrl = processedUrl || capturedUrl;

  return (
    <div className="space-y-4">
      {/* Calibration panel */}
      <div className="bg-cardstock rounded-2xl p-4 shadow-soft space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-bold text-ink">Camera Calibration</h3>
          {calibration ? (
            <span className="text-xs font-semibold text-craft-mint">✅ Calibrated</span>
          ) : (
            <span className="text-xs font-semibold text-craft-rose">Not calibrated</span>
          )}
        </div>
        <p className="text-xs text-ink/70">
          Place a reference object of known size (e.g., a credit card) in the frame and snap it. After that, every patch captured will be measured in real millimetres.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-ink/60 block mb-1">Reference width (mm)</label>
            <input
              type="number"
              value={refWidth}
              onChange={(e) => setRefWidth(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-ink/10 focus:border-craft-mint outline-none text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-ink/60 block mb-1">Reference height (mm)</label>
            <input
              type="number"
              value={refHeight}
              onChange={(e) => setRefHeight(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-ink/10 focus:border-craft-mint outline-none text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCalibrate}
            disabled={!stream || calibrating}
            className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {calibrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {calibrating ? 'Calibrating...' : 'Calibrate Camera'}
          </button>
          {calibration && (
            <button
              onClick={() => {
                setCalibration(null);
                setCalibrationPreview('');
                setCalibrationError('');
                localStorage.removeItem('patchpress-camera-calibration');
              }}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-ink/60 hover:bg-paper transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={handleManualCalibrate}
            disabled={!stream || calibrating}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-ink/60 hover:bg-paper transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Draw a box around the reference object instead of auto-detecting"
          >
            <Crop className="w-4 h-4" /> Draw box
          </button>
        </div>

        {calibration && (
          <p className="text-[10px] text-ink/60 bg-craft-mint/10 rounded-lg px-3 py-2">
            Your reference ({calibration.refWidth} × {calibration.refHeight} mm) measured{' '}
            {Math.round(calibration.pixelsPerMm * calibration.refWidth)} × {Math.round(calibration.pixelsPerMm * calibration.refHeight)} px
            → <strong>{calibration.pixelsPerMm.toFixed(2)} px/mm</strong>. Captured items are now auto-sized in real mm.
            Valid only at this camera distance — if you move the camera, Clear and calibrate again.
          </p>
        )}

        {calibrationError && (
          <div className="flex items-start gap-2 text-xs text-craft-rose bg-craft-rose/10 p-3 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{calibrationError}</span>
          </div>
        )}

        {calibrationPreview && (
          <div className="space-y-2">
            <p className="text-xs text-ink/70">This is what the camera saw. The green box is the detected reference object.</p>
            <img src={calibrationPreview} alt="Calibration preview" className="w-full rounded-xl border border-ink/10" />
          </div>
        )}
      </div>

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
                ref={setVideoElement}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              />
              {!stream && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
              {stream && (
                <div className="absolute top-3 left-3 right-3 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5">
                  <ZoomIn className="w-3.5 h-3.5 text-white/80 shrink-0" />
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.25"
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 accent-craft-mint h-1"
                  />
                  <span className="text-[10px] font-semibold text-white/80 w-8 text-right">{zoom.toFixed(2).replace(/\.?0+$/, '')}×</span>
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
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleRotate('ccw')}
                  disabled={!processedUrl || isProcessing || isRotating}
                  className="p-1.5 rounded-lg text-ink/60 hover:text-ink hover:bg-paper transition-colors disabled:opacity-40"
                  title="Rotate 90° left"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRotate('cw')}
                  disabled={!processedUrl || isProcessing || isRotating}
                  className="p-1.5 rounded-lg text-ink/60 hover:text-ink hover:bg-paper transition-colors disabled:opacity-40"
                  title="Rotate 90° right"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button onClick={handleReset} className="text-xs text-ink/60 hover:text-ink flex items-center gap-1 ml-1">
                  <RefreshCw className="w-3 h-3" /> Retake
                </button>
              </div>
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
                      processImage(capturedUrl, val, edgeErode).then((result) => {
                        if (result) {
                          if (processedUrl && processedUrl !== capturedUrl && processedUrl !== processedBaseUrl) URL.revokeObjectURL(processedUrl);
                          if (processedBaseUrl && processedBaseUrl !== capturedUrl && processedBaseUrl.startsWith('blob:')) URL.revokeObjectURL(processedBaseUrl);
                          if (rawProcessedUrl && rawProcessedUrl !== capturedUrl && rawProcessedUrl.startsWith('blob:')) URL.revokeObjectURL(rawProcessedUrl);
                          setProcessedUrl(result.url);
                          setRawProcessedUrl(result.rawUrl);
                          setProcessedBaseUrl(result.url);
                          setBaseBlob(result.blob);
                          resetAdjustments();
                          setCroppedBlob(result.blob);
                          if (calibration) {
                            setWidth(String(Math.round(result.bbox.w / calibration.pixelsPerMm)));
                            setHeight(String(Math.round(result.bbox.h / calibration.pixelsPerMm)));
                          } else {
                            setWidth(String(result.bbox.w));
                            setHeight(String(result.bbox.h));
                          }
                        }
                        setIsProcessing(false);
                      });
                    }
                  }}
                  className="w-full accent-craft-mint"
                />
                <p className="text-[10px] text-ink/50 mt-1">Lower value = stricter background removal (strong contrast only); higher = more sensitive, keeps shadows and faint details</p>
              </div>
            )}
            {!isProcessing && (
              <div className="mt-3">
                <label className="text-xs font-semibold text-ink/70 mb-1 block">Edge cleanup: {edgeErode}px</label>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="1"
                  value={edgeErode}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEdgeErode(val);
                    if (capturedUrl) {
                      setIsProcessing(true);
                      processImage(capturedUrl, threshold, val).then((result) => {
                        if (result) {
                          if (processedUrl && processedUrl !== capturedUrl && processedUrl !== processedBaseUrl) URL.revokeObjectURL(processedUrl);
                          if (processedBaseUrl && processedBaseUrl !== capturedUrl && processedBaseUrl.startsWith('blob:')) URL.revokeObjectURL(processedBaseUrl);
                          if (rawProcessedUrl && rawProcessedUrl !== capturedUrl && rawProcessedUrl.startsWith('blob:')) URL.revokeObjectURL(rawProcessedUrl);
                          setProcessedUrl(result.url);
                          setRawProcessedUrl(result.rawUrl);
                          setProcessedBaseUrl(result.url);
                          setBaseBlob(result.blob);
                          resetAdjustments();
                          setCroppedBlob(result.blob);
                        }
                        setIsProcessing(false);
                      });
                    }
                  }}
                  className="w-full accent-craft-mint"
                />
                <p className="text-[10px] text-ink/50 mt-1">Trims leftover background halo around the edges. Higher = cleaner cut, but eats slightly into the object.</p>
                {processedUrl && (
                  <button
                    onClick={() => setShowMaskEditor(true)}
                    className="mt-2 w-full px-3 py-2 rounded-xl text-sm font-semibold text-ink/70 bg-paper hover:bg-paper/70 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Paintbrush className="w-4 h-4" /> Touch Up Edges Manually
                  </button>
                )}
              </div>
            )}
            {!isProcessing && processedUrl && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-ink/70 mb-1 block">Brightness: {brightness > 0 ? `+${brightness}` : brightness}</label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={brightness}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBrightness(val);
                      applyAdjustments(colorTemp, colorTint, val, contrast, sharpness);
                    }}
                    className="w-full accent-craft-mint"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink/70 mb-1 block">Contrast: {contrast > 0 ? `+${contrast}` : contrast}</label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={contrast}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setContrast(val);
                      applyAdjustments(colorTemp, colorTint, brightness, val, sharpness);
                    }}
                    className="w-full accent-craft-mint"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink/70 mb-1 block">Sharpness: +{sharpness}</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={sharpness}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSharpness(val);
                      applyAdjustments(colorTemp, colorTint, brightness, contrast, val);
                    }}
                    className="w-full accent-craft-mint"
                  />
                  <p className="text-[10px] text-ink/50 mt-1">Extra sharpening on top of the automatic pass. Too much creates halos around edges.</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink/70 mb-1 block">Warmth: {colorTemp > 0 ? `+${colorTemp}` : colorTemp}</label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={colorTemp}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setColorTemp(val);
                      applyAdjustments(val, colorTint, brightness, contrast, sharpness);
                    }}
                    className="w-full accent-craft-mint"
                  />
                  <p className="text-[10px] text-ink/50 mt-1">Negative = cooler (bluer), positive = warmer (yellower). Fixes green/blue colour casts from lighting.</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink/70 mb-1 block">Tint: {colorTint > 0 ? `+${colorTint}` : colorTint}</label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={colorTint}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setColorTint(val);
                      applyAdjustments(colorTemp, val, brightness, contrast, sharpness);
                    }}
                    className="w-full accent-craft-mint"
                  />
                  <p className="text-[10px] text-ink/50 mt-1">Negative = more green, positive = more magenta.</p>
                </div>
                {(colorTemp !== 0 || colorTint !== 0 || brightness !== 0 || contrast !== 0 || sharpness !== 0) && (
                  <button
                    onClick={() => { resetAdjustments(); applyAdjustments(0, 0, 0, 0, 0); }}
                    className="text-xs font-semibold text-ink/60 hover:text-ink underline"
                  >
                    Reset all adjustments
                  </button>
                )}
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
                  <label className="text-xs font-semibold text-ink/70 block mb-1">Width</label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-ink/10 focus:border-craft-mint outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink/70 block mb-1">Height</label>
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
                onClick={() => setShowZoneEditor(true)}
                disabled={!processedUrl}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-dashed border-ink/15 text-sm font-semibold text-ink/70 hover:border-craft-mint hover:text-craft-mint transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Crop className="w-4 h-4" />
                {contentZone.width === 100 && contentZone.height === 100
                  ? 'Edit Content Zone (Trim)'
                  : `Content Zone: ${Math.round(contentZone.width)}% × ${Math.round(contentZone.height)}% — Edit`}
              </button>
              <button
                onClick={() => setShowPictureEditor(true)}
                disabled={!processedUrl}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-dashed border-ink/15 text-sm font-semibold text-ink/70 hover:border-indigo-400 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ImageIcon className="w-4 h-4" />
                {pictureZone.width === 100 && pictureZone.height === 100
                  ? 'Edit Picture Zone (What Customers See)'
                  : `Picture Zone: ${Math.round(pictureZone.width)}% × ${Math.round(pictureZone.height)}% — Edit`}
              </button>
              <p className="text-[10px] text-ink/50">
                Width/Height set the patch&apos;s real size in millimetres. Calibrate the camera once with a reference card and these will be filled automatically for every patch.
              </p>
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

      {showZoneEditor && processedUrl && createPortal(
        <ImageTracer
          imageUrl={processedUrl}
          mode="patch"
          title="Edit Patch Content Zone"
          initialZone={contentZone}
          onSave={(zone) => {
            setContentZone(zone);
            setShowZoneEditor(false);
          }}
          onCancel={() => setShowZoneEditor(false)}
        />,
        document.body
      )}

      {showPictureEditor && processedUrl && createPortal(
        <ImageTracer
          imageUrl={processedUrl}
          mode="crop"
          title="Edit Picture Zone (what customers see in the picker)"
          initialZone={pictureZone}
          onSave={(zone) => {
            setPictureZone(zone);
            setShowPictureEditor(false);
          }}
          onCancel={() => setShowPictureEditor(false)}
        />,
        document.body
      )}

      {manualCalFrame && createPortal(
        <ImageTracer
          imageUrl={manualCalFrame.url}
          mode="crop"
          title="Draw a box around the reference object"
          onSave={handleManualZoneSave}
          onCancel={() => setManualCalFrame(null)}
        />,
        document.body
      )}

      {showMaskEditor && processedUrl && createPortal(
        <MaskEditor
          imageUrl={processedUrl}
          originalUrl={rawProcessedUrl || undefined}
          title="Touch Up Patch Edges"
          onSave={(blob, url) => {
            if (processedUrl !== capturedUrl && processedUrl.startsWith('blob:')) URL.revokeObjectURL(processedUrl);
            if (processedBaseUrl && processedBaseUrl !== capturedUrl && processedBaseUrl !== processedUrl && processedBaseUrl.startsWith('blob:')) URL.revokeObjectURL(processedBaseUrl);
            setProcessedUrl(url);
            setProcessedBaseUrl(url);
            setBaseBlob(blob);
            resetAdjustments();
            setCroppedBlob(blob);
            setShowMaskEditor(false);
          }}
          onCancel={() => setShowMaskEditor(false)}
        />,
        document.body
      )}
    </div>
  );
}

export default PatchCapture;
