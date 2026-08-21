import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Camera, RefreshCw, AlertCircle, Loader2, X, Crop, RotateCw, RotateCcw, Paintbrush, ZoomIn } from 'lucide-react';
import { storage } from '../lib/supabase';
import { analyzeFrameLayered } from '../lib/objectDetect';
import { enhanceCapture, rotateImage90, whiteBalanceFromBackground, adjustImage } from '../lib/imageEnhance';
import { ImageTracer } from '../ImageTracer';
import type { TracedZone } from '../ImageTracer';
import { MaskEditor } from './MaskEditor';
import { v4 as uuidv4 } from 'uuid';

interface ProductCaptureResult {
  frontUrl: string;
  backUrl: string;
  widthMm: number;
  heightMm: number;
}

interface ProductCaptureProps {
  onCaptured: (result: ProductCaptureResult) => void;
  onCancel: () => void;
}

// Camera calibration for real-world mm sizing (shared with PatchCapture via localStorage)
interface Calibration {
  pixelsPerMm: number;
  refWidth: number;
  refHeight: number;
  capturedAt: number;
}

type CaptureStep = 'front' | 'back-prompt' | 'back' | 'details';

export function ProductCapture({ onCaptured, onCancel }: ProductCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [step, setStep] = useState<CaptureStep>('front');

  const [capturedUrl, setCapturedUrl] = useState<string>('');
  const [processedUrl, setProcessedUrl] = useState<string>('');
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [threshold, setThreshold] = useState(240);
  // Products may themselves be white, so the transparency pass is optional
  const [removeBackground, setRemoveBackground] = useState(true);
  // How many pixels of halo to trim from the cut-out edge (0 = off)
  const [edgeErode, setEdgeErode] = useState(1);
  // Digital zoom — crops the centre 1/zoom of the frame WITHOUT rescaling, so
  // absolute pixel scale (and therefore calibration) is unchanged at any zoom
  const [zoom, setZoom] = useState(1);
  const [showMaskEditor, setShowMaskEditor] = useState(false);
  // Unkeyed copy of the processed crop — restore source for the touch-up editor
  const [rawProcessedUrl, setRawProcessedUrl] = useState('');
  // Auto-processed base image + manual warmth/tint applied on top of it
  const [processedBaseUrl, setProcessedBaseUrl] = useState('');
  const [baseBlob, setBaseBlob] = useState<Blob | null>(null);
  const [colorTemp, setColorTemp] = useState(0);
  const [colorTint, setColorTint] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [sharpness, setSharpness] = useState(0);

  const [frontBlob, setFrontBlob] = useState<Blob | null>(null);
  const [frontPreviewUrl, setFrontPreviewUrl] = useState<string>('');
  const [backBlob, setBackBlob] = useState<Blob | null>(null);
  const [backPreviewUrl, setBackPreviewUrl] = useState<string>('');

  const [widthMm, setWidthMm] = useState('');
  const [heightMm, setHeightMm] = useState('');

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

  // Auto-crop: detect content pixels on light/white background; optionally make background transparent
  const processImage = useCallback(
    async (imageUrl: string, thresholdValue: number, removeBg: boolean, erodePx: number): Promise<{ blob: Blob; url: string; rawUrl: string; bbox: { x: number; y: number; w: number; h: number } } | null> => {
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

          // If background removal is disabled, keep the full image so the user can
          // draw/erase the outline themselves. Still run white-balance on the full
          // frame if a background was detected. The manual touch-up editor will trim
          // to opaque pixels when the user saves.
          if (!removeBg) {
            if (detection.background) {
              const bgMask = new Uint8Array(w * h);
              let bgCount = 0;
              for (let i = 0; i < w * h; i++) {
                if (detection.background[i] === 1) {
                  bgMask[i] = 1;
                  bgCount++;
                }
              }
              if (bgCount > 100) {
                whiteBalanceFromBackground(imageData, bgMask);
                fullCtx.putImageData(imageData, 0, 0);
              }
            }
            enhanceCapture(imageData, 0.35, 0);
            fullCtx.putImageData(imageData, 0, 0);
            fullCanvas.toBlob((blob) => {
              if (!blob) return resolve(null);
              resolve({
                blob,
                url: URL.createObjectURL(blob),
                rawUrl: URL.createObjectURL(blob),
                bbox: { x: 0, y: 0, w, h },
              });
            }, 'image/png');
            return;
          }

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

  // After manual touch-up, re-crop to the opaque content so the product is
  // zoomed-in consistently with the auto-removal path.
  // `originalImageUrl` stays as the restore source (full/uncropped image).
  const retrimToOpaque = useCallback(
    async (imageUrl: string, originalImageUrl: string, padding: number = 6): Promise<{ blob: Blob; url: string; rawUrl: string; bbox: { x: number; y: number; w: number; h: number } } | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, w, h);
          const data = imageData.data;

          let minX = w, minY = h, maxX = 0, maxY = 0;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const i = (y * w + x) * 4;
              if (data[i + 3] > 20) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          if (minX > maxX || minY > maxY) return resolve(null);

          const cropMinX = Math.max(0, minX - padding);
          const cropMinY = Math.max(0, minY - padding);
          const cropMaxX = Math.min(w, maxX + 1 + padding);
          const cropMaxY = Math.min(h, maxY + 1 + padding);
          const cropW = cropMaxX - cropMinX;
          const cropH = cropMaxY - cropMinY;

          const out = document.createElement('canvas');
          out.width = cropW;
          out.height = cropH;
          const octx = out.getContext('2d');
          if (!octx) return resolve(null);
          octx.drawImage(img, cropMinX, cropMinY, cropW, cropH, 0, 0, cropW, cropH);

          const rawImg = new Image();
          rawImg.crossOrigin = 'anonymous';
          rawImg.onload = () => {
            const rawOut = document.createElement('canvas');
            rawOut.width = cropW;
            rawOut.height = cropH;
            const rctx = rawOut.getContext('2d');
            if (!rctx) return resolve(null);
            rctx.drawImage(rawImg, cropMinX, cropMinY, cropW, cropH, 0, 0, cropW, cropH);
            rawOut.toBlob((rawBlob) => {
              if (!rawBlob) return resolve(null);
              out.toBlob((blob) => {
                if (!blob) return resolve(null);
                resolve({
                  blob,
                  url: URL.createObjectURL(blob),
                  rawUrl: URL.createObjectURL(rawBlob),
                  bbox: { x: cropMinX, y: cropMinY, w: cropW, h: cropH },
                });
              }, 'image/png');
            }, 'image/png');
          };
          rawImg.onerror = () => resolve(null);
          rawImg.src = originalImageUrl;
        };
        img.onerror = () => resolve(null);
        img.src = imageUrl;
      });
    },
    []
  );

  const applyResult = useCallback(
    async (result: { blob: Blob; url: string; rawUrl: string; bbox: { x: number; y: number; w: number; h: number } } | null, rawUrl: string, rawWidth: number, rawHeight: number) => {
      if (result) {
        setProcessedUrl((prev) => {
          if (prev && prev !== rawUrl && prev !== processedBaseUrl && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
          return result.url;
        });
        setProcessedBaseUrl((prev) => {
          if (prev && prev !== rawUrl && prev !== result.url && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
          return result.url;
        });
        setBaseBlob(result.blob);
        resetAdjustments();
        setRawProcessedUrl((prev) => {
          if (prev && prev !== rawUrl && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
          return result.rawUrl;
        });
        setCroppedBlob(result.blob);
        // Only the front capture defines the product's real-world size
        if (step === 'front') {
          if (calibration) {
            setWidthMm(String(Math.round(result.bbox.w / calibration.pixelsPerMm)));
            setHeightMm(String(Math.round(result.bbox.h / calibration.pixelsPerMm)));
          } else {
            setWidthMm(String(result.bbox.w));
            setHeightMm(String(result.bbox.h));
          }
        }
      } else {
        // Fallback: use full image without cropping
        const res = await fetch(rawUrl);
        const blob = await res.blob();
        setProcessedUrl(rawUrl);
        setRawProcessedUrl(rawUrl);
        setProcessedBaseUrl(rawUrl);
        setBaseBlob(blob);
        resetAdjustments();
        setCroppedBlob(blob);
        if (step === 'front' && rawWidth > 0 && rawHeight > 0) {
          setWidthMm(String(rawWidth));
          setHeightMm(String(rawHeight));
        }
      }
    },
    [step, calibration, processedBaseUrl]
  );

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
    setProcessedBaseUrl('');
    setBaseBlob(null);
    resetAdjustments();
    setCroppedBlob(null);

    const result = await processImage(rawUrl, threshold, removeBackground, edgeErode);
    await applyResult(result, rawUrl, canvas.width, canvas.height);
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

  // Manual calibration: draw a box around the reference object when auto-detect fails
  const [manualCalFrame, setManualCalFrame] = useState<{ url: string; w: number; h: number } | null>(null);

  const handleManualCalibrate = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) { setCalibrationError('Camera not ready yet — wait a moment and try again'); return; }
    const canvas = snapZoomedFrame(video, zoom);
    if (!canvas) return;
    setCalibrationError('');
    setCalibrationPreview('');
    setManualCalFrame({ url: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height });
  };

  const handleManualZoneSave = (zone: TracedZone) => {
    if (!manualCalFrame) return;
    const pxW = (zone.width / 100) * manualCalFrame.w;
    const pxH = (zone.height / 100) * manualCalFrame.h;
    if (pxW < 5 || pxH < 5) { setCalibrationError('Box is too small — draw it snugly around the whole card'); setManualCalFrame(null); return; }
    const realW = Number(refWidth) || 1;
    const realH = Number(refHeight) || 1;
    const cal: Calibration = { pixelsPerMm: ((pxW / realW) + (pxH / realH)) / 2, refWidth: realW, refHeight: realH, capturedAt: Date.now() };
    setCalibration(cal);
    localStorage.setItem('patchpress-camera-calibration', JSON.stringify(cal));
    const frame = manualCalFrame;
    setManualCalFrame(null);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = frame.w; c.height = frame.h;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = Math.max(2, frame.w / 300);
      ctx.strokeRect(zone.x / 100 * frame.w, zone.y / 100 * frame.h, pxW, pxH);
      setCalibrationPreview(c.toDataURL('image/png'));
    };
    img.src = frame.url;
  };

  const handleRetake = () => {
    if (processedUrl && processedUrl !== capturedUrl) {
      URL.revokeObjectURL(processedUrl);
    }
    if (rawProcessedUrl && rawProcessedUrl !== capturedUrl && rawProcessedUrl.startsWith('blob:')) {
      URL.revokeObjectURL(rawProcessedUrl);
    }
    if (processedBaseUrl && processedBaseUrl !== capturedUrl && processedBaseUrl !== processedUrl && processedBaseUrl.startsWith('blob:')) {
      URL.revokeObjectURL(processedBaseUrl);
    }
    setCapturedUrl('');
    setProcessedUrl('');
    setRawProcessedUrl('');
    setProcessedBaseUrl('');
    setBaseBlob(null);
    resetAdjustments();
    setCroppedBlob(null);
  };

  // Rotate a captured front/back image by ±90°; front rotation swaps the mm measurements
  const [isRotating, setIsRotating] = useState(false);
  const handleRotate = async (side: 'front' | 'back', direction: 'cw' | 'ccw') => {
    const url = side === 'front' ? frontPreviewUrl : backPreviewUrl;
    if (!url || isRotating) return;
    setIsRotating(true);
    const rotated = await rotateImage90(url, direction);
    if (rotated) {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      if (side === 'front') {
        setFrontBlob(rotated.blob);
        setFrontPreviewUrl(rotated.url);
        const w = widthMm;
        setWidthMm(heightMm);
        setHeightMm(w);
      } else {
        setBackBlob(rotated.blob);
        setBackPreviewUrl(rotated.url);
      }
    }
    setIsRotating(false);
  };

  const handleUsePhoto = () => {
    if (!croppedBlob || !processedUrl) return;
    if (step === 'front') {
      setFrontBlob(croppedBlob);
      setFrontPreviewUrl(processedUrl);
      setCapturedUrl('');
      setProcessedUrl('');
    setRawProcessedUrl('');
      setCroppedBlob(null);
      setStep('back-prompt');
    } else if (step === 'back') {
      setBackBlob(croppedBlob);
      setBackPreviewUrl(processedUrl);
      setCapturedUrl('');
      setProcessedUrl('');
    setRawProcessedUrl('');
      setCroppedBlob(null);
      setStep('details');
    }
  };

  const handleConfirm = async () => {
    if (!frontBlob) return;
    setIsUploading(true);
    try {
      const frontUrl = await storage.upload('products', `${uuidv4()}.png`, frontBlob);
      let backUrl = frontUrl;
      if (backBlob) {
        backUrl = await storage.upload('products', `${uuidv4()}.png`, backBlob);
      }
      onCaptured({
        frontUrl,
        backUrl,
        widthMm: Number(widthMm) || 0,
        heightMm: Number(heightMm) || 0,
      });
    } catch (err: any) {
      console.error('Failed to upload product images:', err);
      alert('Failed to upload product images: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const previewUrl = processedUrl || capturedUrl;
  const isCapturing = (step === 'front' || step === 'back');

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
          Place a reference object of known size (e.g., a credit card) in the frame and snap it. After that, every product captured will be measured in real millimetres.
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
            disabled={!stream || calibrating || !isCapturing || !!capturedUrl}
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
            disabled={!stream || calibrating || !isCapturing || !!capturedUrl}
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
      {isCapturing && !capturedUrl && (
        <div className="space-y-2">
          <h3 className="font-heading text-lg font-bold text-ink">
            {step === 'front' ? 'Capture Front Image' : 'Capture Back Image'}
          </h3>
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
          <button onClick={onCancel} className="text-xs text-ink/60 hover:text-ink flex items-center gap-1">
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      )}

      {/* Captured preview */}
      {isCapturing && capturedUrl && (
        <div className="space-y-4">
          <div className="bg-cardstock rounded-2xl p-3 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-lg font-bold text-ink">
                {step === 'front' ? 'Captured Front' : 'Captured Back'}
              </h3>
              <button onClick={handleRetake} className="text-xs text-ink/60 hover:text-ink flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Retake
              </button>
            </div>
            <div className="relative bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjBmMGYwIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNmMGYwZjAiLz48cmVjdCB4PSIxMCIgeT0iMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTBlMGUwIi8+PHJlY3QgeD0iMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI2UwZTBlMCIvPjwvc3ZnPg==')] rounded-xl overflow-hidden border border-ink/10 flex items-center justify-center" style={{ minHeight: '200px' }}>
              {isProcessing ? (
                <div className="py-12 flex flex-col items-center text-ink/60">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p className="text-sm">Cropping product...</p>
                </div>
              ) : previewUrl ? (
                <img src={previewUrl} alt="Product preview" className="max-w-full max-h-64 object-contain p-4" />
              ) : null}
            </div>
            {!isProcessing && (
              <div className="mt-3 space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-ink/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={removeBackground}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setRemoveBackground(checked);
                      if (capturedUrl) {
                        setIsProcessing(true);
                        processImage(capturedUrl, threshold, checked, edgeErode).then(async (result) => {
                          await applyResult(result, capturedUrl, 0, 0);
                          setIsProcessing(false);
                        });
                      }
                    }}
                    className="w-4 h-4 accent-craft-mint"
                  />
                  Remove white background
                </label>
                <p className="text-[10px] text-ink/50">Turn this off for white or very light products so they are not made transparent.</p>
                <div>
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
                        processImage(capturedUrl, val, removeBackground, edgeErode).then(async (result) => {
                          await applyResult(result, capturedUrl, 0, 0);
                          setIsProcessing(false);
                        });
                      }
                    }}
                    className="w-full accent-craft-mint"
                  />
                  <p className="text-[10px] text-ink/50 mt-1">Lower value = stricter background removal (strong contrast only); higher = more sensitive, keeps shadows and faint details</p>
                </div>
                {removeBackground && (
                  <div>
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
                          processImage(capturedUrl, threshold, removeBackground, val).then(async (result) => {
                            await applyResult(result, capturedUrl, 0, 0);
                            setIsProcessing(false);
                          });
                        }
                      }}
                      className="w-full accent-craft-mint"
                    />
                    <p className="text-[10px] text-ink/50 mt-1">Trims leftover background halo around the edges. Higher = cleaner cut, but eats slightly into the object.</p>
                  </div>
                )}
                {processedUrl && (
                  <button
                    onClick={() => setShowMaskEditor(true)}
                    className="w-full px-3 py-2 rounded-xl text-sm font-semibold text-ink/70 bg-paper hover:bg-paper/70 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Paintbrush className="w-4 h-4" /> Touch Up Edges Manually
                  </button>
                )}
                {processedUrl && (
                  <>
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
                  </>
                )}
              </div>
            )}
          </div>

          {!isProcessing && (
            <button
              onClick={handleUsePhoto}
              disabled={!croppedBlob}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" /> Use this photo
            </button>
          )}
        </div>
      )}

      {/* Back image prompt */}
      {step === 'back-prompt' && (
        <div className="bg-cardstock rounded-2xl p-4 shadow-soft space-y-4">
          <h3 className="font-heading text-lg font-bold text-ink">Capture Back Image?</h3>
          {frontPreviewUrl && (
            <div className="flex items-center gap-3">
              <img src={frontPreviewUrl} alt="Front preview" className="w-20 h-20 object-contain rounded-xl border border-ink/10 bg-white" />
              <p className="text-xs text-ink/70">Front image captured. You can capture a back image too, or skip and reuse the front.</p>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setStep('back')} className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm">
              <Camera className="w-4 h-4" /> Capture Back Image
            </button>
            <button
              onClick={() => {
                setBackBlob(null);
                setBackPreviewUrl('');
                setStep('details');
              }}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-ink/70 bg-paper hover:bg-paper/70 transition-colors"
            >
              Skip (use front as back)
            </button>
          </div>
        </div>
      )}

      {/* Details / confirm */}
      {step === 'details' && (
        <div className="bg-cardstock rounded-2xl p-4 shadow-soft space-y-4">
          <h3 className="font-heading text-lg font-bold text-ink">Product Details</h3>
          <div className="flex gap-4">
            {frontPreviewUrl && (
              <div className="text-center">
                <img src={frontPreviewUrl} alt="Front preview" className="w-24 h-24 object-contain rounded-xl border border-ink/10 bg-white" />
                <p className="text-[10px] text-ink/50 mt-1">Front</p>
                <div className="flex justify-center gap-1 mt-0.5">
                  <button onClick={() => handleRotate('front', 'ccw')} disabled={isRotating} className="p-1 rounded text-ink/50 hover:text-ink disabled:opacity-40" title="Rotate 90° left">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleRotate('front', 'cw')} disabled={isRotating} className="p-1 rounded text-ink/50 hover:text-ink disabled:opacity-40" title="Rotate 90° right">
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
            <div className="text-center">
              {backPreviewUrl ? (
                <img src={backPreviewUrl} alt="Back preview" className="w-24 h-24 object-contain rounded-xl border border-ink/10 bg-white" />
              ) : (
                <div className="w-24 h-24 rounded-xl border border-dashed border-ink/20 flex items-center justify-center text-[10px] text-ink/50 p-2">Same as front</div>
              )}
              <p className="text-[10px] text-ink/50 mt-1">Back</p>
              {backPreviewUrl && (
                <div className="flex justify-center gap-1 mt-0.5">
                  <button onClick={() => handleRotate('back', 'ccw')} disabled={isRotating} className="p-1 rounded text-ink/50 hover:text-ink disabled:opacity-40" title="Rotate 90° left">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleRotate('back', 'cw')} disabled={isRotating} className="p-1 rounded text-ink/50 hover:text-ink disabled:opacity-40" title="Rotate 90° right">
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink/70 block mb-1">Width (mm)</label>
              <input
                type="number"
                value={widthMm}
                onChange={(e) => setWidthMm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-ink/10 focus:border-craft-mint outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink/70 block mb-1">Height (mm)</label>
              <input
                type="number"
                value={heightMm}
                onChange={(e) => setHeightMm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-ink/10 focus:border-craft-mint outline-none text-sm"
              />
            </div>
          </div>
          <p className="text-[10px] text-ink/50">
            Width/Height set the product&apos;s real size in millimetres, measured from the front capture. Calibrate the camera once with a reference card and these will be filled automatically.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={!frontBlob || isUploading}
              className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
              ) : (
                <><Camera className="w-4 h-4" /> Use These Images</>
              )}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-ink/60 hover:bg-paper transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
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

      {showMaskEditor && capturedUrl && createPortal(
        <MaskEditor
          imageUrl={capturedUrl}
          originalUrl={capturedUrl}
          title="Touch Up Product Edges"
          onSave={async (blob, url) => {
            if (processedUrl !== capturedUrl && processedUrl.startsWith('blob:')) URL.revokeObjectURL(processedUrl);
            if (processedBaseUrl && processedBaseUrl !== capturedUrl && processedBaseUrl !== processedUrl && processedBaseUrl.startsWith('blob:')) URL.revokeObjectURL(processedBaseUrl);
            // The uncropped captured frame is the authoritative restore source.
            const originalSource = capturedUrl || rawProcessedUrl || url;
            const trimmed = await retrimToOpaque(url, originalSource);
            if (trimmed) {
              setProcessedUrl(trimmed.url);
              setProcessedBaseUrl(trimmed.url);
              setBaseBlob(trimmed.blob);
              // rawProcessedUrl stays as the full uncropped source so restore still works.
              setRawProcessedUrl(trimmed.rawUrl);
              setCroppedBlob(trimmed.blob);
              if (step === 'front' && calibration) {
                setWidthMm(String(Math.round(trimmed.bbox.w / calibration.pixelsPerMm)));
                setHeightMm(String(Math.round(trimmed.bbox.h / calibration.pixelsPerMm)));
              } else if (step === 'front') {
                setWidthMm(String(trimmed.bbox.w));
                setHeightMm(String(trimmed.bbox.h));
              }
            } else {
              setProcessedUrl(url);
              setProcessedBaseUrl(url);
              setBaseBlob(blob);
              setCroppedBlob(blob);
            }
            resetAdjustments();
            setShowMaskEditor(false);
          }}
          onCancel={() => setShowMaskEditor(false)}
        />,
        document.body
      )}
    </div>
  );
}

export default ProductCapture;
