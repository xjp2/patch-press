import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Ruler, Printer, ArrowLeft, ArrowUp, Crosshair } from 'lucide-react';
import { getClipAndCenter, fixImagePath } from '../lib/utils';
import type { PlacementZone } from '../lib/utils';

interface PlacedPatch {
  id: string;
  name: string;
  image: string;
  price: number;
  x: number;
  y: number;
  rotation: number;
  widthPercent: number;
  heightPercent: number;
  contentZone?: {
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'rectangle' | 'polygon';
    points?: { x: number; y: number }[];
  };
}

interface CraftingViewProps {
  productName: string;
  productImage: string;
  productBackImage?: string;
  patches: PlacedPatch[];
  side: 'front' | 'back';
  onClose: () => void;
  productWidthCm?: number;
  productHeightCm?: number;
  placementZone?: PlacementZone;
}

export function CraftingView({
  productName,
  productImage,
  productBackImage,
  patches,
  side,
  onClose,
  productWidthCm = 40,
  productHeightCm = 45,
  placementZone,
}: CraftingViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [selectedPatch, setSelectedPatch] = useState<PlacedPatch | null>(null);

  const displayImage = side === 'front' ? productImage : (productBackImage || productImage);

  const measure = useCallback(() => {
    const img = imgRef.current;
    if (!img || img.naturalWidth === 0) return;

    // Leave room for sidebar (280px) + gaps + padding
    const maxW = Math.min(window.innerWidth - 360, 520);
    const maxH = window.innerHeight * 0.55;

    const aspect = img.naturalWidth / img.naturalHeight;
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }

    setContainerSize({ width: Math.round(w), height: Math.round(h) });
    setImgNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const percentToCm = (percent: number, dimension: 'width' | 'height') => {
    const size = dimension === 'width' ? productWidthCm : productHeightCm;
    return ((percent / 100) * size);
  };

  const getPatchMeasurements = (patch: PlacedPatch) => {
    const patchWidthCm = percentToCm(patch.widthPercent, 'width');
    const patchHeightCm = percentToCm(patch.heightPercent, 'height');
    const centerXCm = percentToCm(patch.x, 'width');
    const centerYCm = percentToCm(patch.y, 'height');
    const fromLeftCm = centerXCm - patchWidthCm / 2;
    const fromTopCm = centerYCm - patchHeightCm / 2;

    return {
      fromLeftCm: Math.max(0, fromLeftCm).toFixed(1),
      fromTopCm: Math.max(0, fromTopCm).toFixed(1),
      centerXCm: centerXCm.toFixed(1),
      centerYCm: centerYCm.toFixed(1),
      widthCm: patchWidthCm.toFixed(1),
      heightCm: patchHeightCm.toFixed(1),
      rotation: patch.rotation,
    };
  };

  const crop = getClipAndCenter(placementZone);

  const handlePrint = () => {
    window.print();
  };

  const gridStepCm = 5;
  // Grid must match the actual image aspect ratio, not the logical product dimensions.
  // The image width corresponds to productWidthCm; height scales proportionally.
  const effectiveHeightCm = imgNaturalSize.width > 0
    ? productWidthCm * (imgNaturalSize.height / imgNaturalSize.width)
    : productHeightCm;
  const vGridCount = Math.floor(productWidthCm / gridStepCm);
  const hGridCount = Math.floor(effectiveHeightCm / gridStepCm);

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center print:static">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 print:hidden"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] mx-4 flex flex-col print:max-w-none print:shadow-none print:rounded-none print:h-auto print:max-h-none">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b print:hidden shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold truncate">{productName} — {side.charAt(0).toUpperCase() + side.slice(1)}</h2>
            <p className="text-xs text-gray-500">
              {patches.length} patch{patches.length !== 1 ? 'es' : ''} • {productWidthCm}cm × {productHeightCm}cm
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-4">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium ${
                showGrid ? 'bg-pink text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Grid
            </button>
            <button
              onClick={handlePrint}
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-medium flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block p-4 border-b">
          <h1 className="text-2xl font-bold">Crafting Sheet</h1>
          <p className="text-gray-600">{productName} — {side.toUpperCase()}</p>
          <p className="text-gray-600">Product: {productWidthCm}cm × {productHeightCm}cm</p>
          <p className="text-gray-600">Date: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 print:p-0">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Product View */}
            <div className="flex-1 min-w-0 flex items-center justify-center bg-gray-50 rounded-xl p-3 print:bg-white print:p-0 border border-gray-100">
              <div
                className="relative"
                style={{
                  width: containerSize.width || 'auto',
                  height: containerSize.height || 'auto',
                  transform: crop.transform,
                }}
              >
                <img
                  ref={imgRef}
                  src={fixImagePath(displayImage)}
                  alt={productName}
                  className="w-full h-full object-contain"
                  style={{ clipPath: crop.clipPath }}
                  onLoad={measure}
                  draggable={false}
                />

                {/* Grid Overlay */}
                {showGrid && containerSize.width > 0 && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Vertical grid lines + cm labels */}
                    {Array.from({ length: vGridCount + 1 }).map((_, i) => {
                      const cm = i * gridStepCm;
                      const isMajor = cm % 10 === 0;
                      return (
                        <div
                          key={`v-${i}`}
                          className="absolute top-0 bottom-0"
                          style={{ left: `${(cm / productWidthCm) * 100}%` }}
                        >
                          <div className={`h-full border-l ${isMajor ? 'border-pink/50' : 'border-pink/20'}`} />
                          <span className={`absolute top-0.5 left-0.5 text-[9px] leading-none ${isMajor ? 'text-pink font-semibold' : 'text-pink/60'}`}>
                            {cm}cm
                          </span>
                        </div>
                      );
                    })}
                    {/* Horizontal grid lines + cm labels */}
                    {Array.from({ length: hGridCount + 1 }).map((_, i) => {
                      const cm = i * gridStepCm;
                      const isMajor = cm % 10 === 0;
                      return (
                        <div
                          key={`h-${i}`}
                          className="absolute left-0 right-0"
                          style={{ top: `${(cm / effectiveHeightCm) * 100}%` }}
                        >
                          <div className={`w-full border-t ${isMajor ? 'border-pink/50' : 'border-pink/20'}`} />
                          <span className={`absolute top-0.5 left-0.5 text-[9px] leading-none ${isMajor ? 'text-pink font-semibold' : 'text-pink/60'}`}>
                            {cm}cm
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Patches Overlay */}
                {patches.map((patch, index) => {
                  const ms = getPatchMeasurements(patch);
                  const cz = patch.contentZone || { x: 0, y: 0, width: 100, height: 100 };
                  const cx = cz.x + cz.width / 2;
                  const cy = cz.y + cz.height / 2;

                  return (
                    <div
                      key={patch.id}
                      className="absolute cursor-pointer group"
                      style={{
                        left: `${patch.x}%`,
                        top: `${patch.y}%`,
                        width: `${patch.widthPercent}%`,
                        height: `${patch.heightPercent}%`,
                        transform: `rotate(${patch.rotation}deg)`,
                        transformOrigin: `${cx}% ${cy}%`,
                      }}
                      onClick={() => setSelectedPatch(patch)}
                    >
                      <img
                        src={patch.image}
                        alt={patch.name}
                        className={`w-full h-full object-contain drop-shadow-lg ${
                          selectedPatch?.id === patch.id ? 'ring-2 ring-pink' : ''
                        }`}
                        style={{
                          clipPath: patch.contentZone
                            ? (patch.contentZone.type === 'polygon' && patch.contentZone.points
                              ? `polygon(${patch.contentZone.points.map((p: {x: number, y: number}) => `${p.x}% ${p.y}%`).join(', ')})`
                              : `inset(${patch.contentZone.y}% ${100 - (patch.contentZone.x + patch.contentZone.width)}% ${100 - (patch.contentZone.y + patch.contentZone.height)}% ${patch.contentZone.x}%)`)
                            : 'none',
                        }}
                        draggable={false}
                      />

                      {/* Number badge */}
                      <div
                        className="absolute w-5 h-5 bg-pink text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow pointer-events-none"
                        style={{
                          left: `${cx}%`,
                          top: `${cy}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        {index + 1}
                      </div>

                      {/* Hover tooltip */}
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        ↓{ms.fromTopCm}cm →{ms.fromLeftCm}cm
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-[260px] flex-shrink-0 print:w-full print:mt-4">
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-3">
                {selectedPatch ? (
                  <>
                    {/* Selected patch header */}
                    <div className="flex items-center gap-2.5 pb-2 border-b border-gray-200">
                      <img
                        src={selectedPatch.image}
                        alt={selectedPatch.name}
                        className="w-10 h-10 object-contain"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{selectedPatch.name}</p>
                        <p className="text-xs text-gray-500">
                          Patch #{patches.findIndex(p => p.id === selectedPatch.id) + 1}
                        </p>
                      </div>
                    </div>

                    {/* Measurements table */}
                    {(() => {
                      const m = getPatchMeasurements(selectedPatch);
                      return (
                        <div className="space-y-0 text-sm">
                          <MeasurementRow icon={<ArrowLeft className="w-3 h-3" />} label="From Left" value={`${m.fromLeftCm}cm`} highlight />
                          <MeasurementRow icon={<ArrowUp className="w-3 h-3" />} label="From Top" value={`${m.fromTopCm}cm`} highlight />
                          <MeasurementRow icon={<Crosshair className="w-3 h-3" />} label="Center X" value={`${m.centerXCm}cm`} />
                          <MeasurementRow icon={<Crosshair className="w-3 h-3" />} label="Center Y" value={`${m.centerYCm}cm`} />
                          <MeasurementRow label="Width" value={`${m.widthCm}cm`} />
                          <MeasurementRow label="Height" value={`${m.heightCm}cm`} />
                          <MeasurementRow label="Rotation" value={`${m.rotation}°`} />
                        </div>
                      );
                    })()}

                    <button
                      onClick={() => setSelectedPatch(null)}
                      className="w-full py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      Back to List
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-xs uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5" />
                      Placement Guide
                    </h3>
                    <div className="space-y-2">
                      {patches.map((patch: PlacedPatch, index: number) => {
                        const m = getPatchMeasurements(patch);
                        return (
                          <button
                            key={patch.id}
                            className={`w-full text-left p-2 rounded-lg border transition-colors ${
                              (selectedPatch as PlacedPatch | null)?.id === patch.id
                                ? 'border-pink bg-pink/5'
                                : 'bg-white border-gray-200 hover:border-pink'
                            }`}
                            onClick={() => setSelectedPatch(patch)}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-pink text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                {index + 1}
                              </div>
                              <img
                                src={patch.image}
                                alt={patch.name}
                                className="w-8 h-8 object-contain flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-xs truncate">{patch.name}</p>
                                <p className="text-[10px] text-gray-500">
                                  ↓{m.fromTopCm}cm →{m.fromLeftCm}cm
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Print Instructions */}
                <div className="pt-2 border-t border-gray-200">
                  <h4 className="font-semibold text-xs mb-1.5">Crafting Instructions</h4>
                  <ol className="text-[11px] text-gray-600 space-y-0.5 list-decimal list-inside leading-relaxed">
                    <li>Print at 100% scale</li>
                    <li>Verify product is {productWidthCm}cm × {productHeightCm}cm</li>
                    <li>Mark positions from left/top edges</li>
                    <li>Apply patches with rotation</li>
                    <li>Heat press per specs</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function MeasurementRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex justify-between items-center py-1.5 ${highlight ? 'bg-pink/5 -mx-1 px-1 rounded' : ''}`}>
      <span className="text-gray-600 text-xs flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className="font-mono font-semibold text-xs">{value}</span>
    </div>
  );
}

export default CraftingView;
