import { useState, useRef } from 'react';
import { X, Ruler, Printer } from 'lucide-react';

interface PlacedPatch {
  id: string;
  name: string;
  image: string;
  price: number;
  x: number; // Percentage (0-100)
  y: number; // Percentage (0-100)
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
  productWidthCm?: number; // Actual product width in cm
  productHeightCm?: number; // Actual product height in cm
}

export function CraftingView({ 
  productName, 
  productImage, 
  productBackImage,
  patches, 
  side,
  onClose,
  productWidthCm = 40, // Default 40cm
  productHeightCm = 45 // Default 45cm
}: CraftingViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [selectedPatch, setSelectedPatch] = useState<PlacedPatch | null>(null);
  // const [imageLoaded, setImageLoaded] = useState(false);
  // const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const displayImage = side === 'front' ? productImage : (productBackImage || productImage);

  // useEffect(() => {
  //   if (containerRef.current) {
  //     const rect = containerRef.current.getBoundingClientRect();
  //     setContainerSize({ width: rect.width, height: rect.height });
  //   }
  // }, [imageLoaded]);

  // Convert percentage to cm
  const percentToCm = (percent: number, dimension: 'width' | 'height') => {
    const size = dimension === 'width' ? productWidthCm : productHeightCm;
    return ((percent / 100) * size).toFixed(1);
  };

  // Calculate patch position in cm from top-left
  const getPatchPositionCm = (patch: PlacedPatch) => {
    const patchWidthCm = (patch.widthPercent / 100) * productWidthCm;
    const patchHeightCm = (patch.heightPercent / 100) * productHeightCm;
    
    // Position is center point, convert to top-left for crafting
    const leftCm = ((patch.x / 100) * productWidthCm) - (patchWidthCm / 2);
    const topCm = ((patch.y / 100) * productHeightCm) - (patchHeightCm / 2);
    
    return {
      left: leftCm.toFixed(1),
      top: topCm.toFixed(1),
      width: patchWidthCm.toFixed(1),
      height: patchHeightCm.toFixed(1),
      centerX: ((patch.x / 100) * productWidthCm).toFixed(1),
      centerY: ((patch.y / 100) * productHeightCm).toFixed(1)
    };
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col print:bg-white print:static">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-lg font-bold">Crafting View - {productName} ({side})</h2>
          <p className="text-sm text-gray-500">
            {patches.length} patches to place • Product: {productWidthCm}cm × {productHeightCm}cm
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              showGrid ? 'bg-pink text-white' : 'bg-gray-100'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setShowMeasurements(!showMeasurements)}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              showMeasurements ? 'bg-pink text-white' : 'bg-gray-100'
            }`}
          >
            <Ruler className="w-4 h-4 inline mr-1" />
            Measurements
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
          >
            <Printer className="w-4 h-4 inline mr-1" />
            Print
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block p-4 border-b">
        <h1 className="text-2xl font-bold">Crafting Sheet</h1>
        <p className="text-gray-600">{productName} - {side.toUpperCase()}</p>
        <p className="text-gray-600">Product Dimensions: {productWidthCm}cm × {productHeightCm}cm</p>
        <p className="text-gray-600">Date: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 print:p-0">
        <div className="flex flex-col lg:flex-row gap-4 h-full">
          {/* Product View */}
          <div className="flex-1 bg-gray-800 rounded-xl p-4 print:bg-white print:p-0">
            <div 
              ref={containerRef}
              className="relative mx-auto max-w-2xl"
            >
              <div className="relative flex items-center justify-center">
                {/* Product Image */}
                <img
                  src={displayImage}
                  alt={productName}
                  className="max-w-full max-h-[70vh] object-contain"
                  // onLoad={() => setImageLoaded(true)}
                />

              {/* Grid Overlay */}
              {showGrid && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* 10cm grid */}
                  {Array.from({ length: Math.ceil(productWidthCm / 10) + 1 }).map((_, i) => (
                    <div
                      key={`v-${i}`}
                      className="absolute top-0 bottom-0 border-l border-dashed border-pink/50"
                      style={{ left: `${(i * 10 / productWidthCm) * 100}%` }}
                    >
                      <span className="absolute -top-4 -left-3 text-xs text-pink bg-white/80 px-1 rounded">
                        {i * 10}cm
                      </span>
                    </div>
                  ))}
                  {Array.from({ length: Math.ceil(productHeightCm / 10) + 1 }).map((_, i) => (
                    <div
                      key={`h-${i}`}
                      className="absolute left-0 right-0 border-t border-dashed border-pink/50"
                      style={{ top: `${(i * 10 / productHeightCm) * 100}%` }}
                    >
                      <span className="absolute -left-8 -top-2 text-xs text-pink bg-white/80 px-1 rounded">
                        {i * 10}cm
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Patches Overlay - Same positioning as CustomizePage */}
              {patches.map((patch, index) => {
                const pos = getPatchPositionCm(patch);
                // Calculate content zone center for transform origin (same as CustomizePage)
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
                        selectedPatch?.id === patch.id ? 'ring-4 ring-pink' : ''
                      }`}
                      style={{
                        clipPath: patch.contentZone
                          ? (patch.contentZone.type === 'polygon' && patch.contentZone.points
                            ? `polygon(${patch.contentZone.points.map((p: {x: number, y: number}) => `${p.x}% ${p.y}%`).join(', ')})`
                            : `inset(${patch.contentZone.y}% ${100 - (patch.contentZone.x + patch.contentZone.width)}% ${100 - (patch.contentZone.y + patch.contentZone.height)}% ${patch.contentZone.x}%)`)
                          : 'none'
                      }}
                    />
                    
                    {/* Patch Number Badge - positioned at content zone center */}
                    <div 
                      className="absolute w-6 h-6 bg-pink text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                      style={{
                        left: `${cx}%`,
                        top: `${cy}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      {index + 1}
                    </div>

                    {/* Quick Measurements on Hover */}
                    {showMeasurements && (
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        {pos.centerX}cm, {pos.centerY}cm
                      </div>
                    )}
                  </div>
                );
              })}
              </div> {/* Close flex container */}
            </div>
          </div>

          {/* Patch List & Measurements */}
          <div className="w-full lg:w-80 bg-white rounded-xl p-4 print:w-full print:mt-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              Placement Guide
            </h3>

            {selectedPatch ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-pink/10 rounded-lg">
                  <img 
                    src={selectedPatch.image} 
                    alt={selectedPatch.name}
                    className="w-12 h-12 object-contain"
                  />
                  <div>
                    <p className="font-semibold">{selectedPatch.name}</p>
                    <p className="text-sm text-gray-500">Patch #{patches.findIndex(p => p.id === selectedPatch.id) + 1}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Center X</span>
                    <span className="font-mono font-semibold">{percentToCm(selectedPatch.x, 'width')}cm</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Center Y</span>
                    <span className="font-mono font-semibold">{percentToCm(selectedPatch.y, 'height')}cm</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Width</span>
                    <span className="font-mono font-semibold">{percentToCm(selectedPatch.widthPercent, 'width')}cm</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Height</span>
                    <span className="font-mono font-semibold">{percentToCm(selectedPatch.heightPercent, 'height')}cm</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Rotation</span>
                    <span className="font-mono font-semibold">{selectedPatch.rotation}°</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPatch(null)}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                >
                  Back to List
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {patches.map((patch, index) => {
                  const pos = getPatchPositionCm(patch);
                  return (
                    <div
                      key={patch.id}
                      className="p-3 border rounded-lg hover:border-pink cursor-pointer transition-colors"
                      onClick={() => setSelectedPatch(patch)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-pink text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <img 
                          src={patch.image} 
                          alt={patch.name}
                          className="w-10 h-10 object-contain"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{patch.name}</p>
                          <p className="text-xs text-gray-500">
                            {pos.centerX}cm, {pos.centerY}cm
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Print Instructions */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg print:bg-white print:border">
              <h4 className="font-semibold mb-2">Crafting Instructions</h4>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Print this sheet at 100% scale</li>
                <li>Verify measurements with ruler</li>
                <li>Mark center points on product</li>
                <li>Place patches at marked positions</li>
                <li>Apply heat press according to patch specs</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CraftingView;
