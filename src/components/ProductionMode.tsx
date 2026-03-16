import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, ChevronLeft, ChevronRight, CheckCircle, 
  Maximize, Minimize, SkipForward, MapPin, Package,
  Clock, User
} from 'lucide-react';

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

interface OrderItem {
  name: string;
  qty: number;
  price: number;
  productImage?: string;
  productBackImage?: string;
  frontPatches?: PlacedPatch[];
  backPatches?: PlacedPatch[];
}

interface ShippingAddress {
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
}

interface Order {
  id: string;
  order_number: string;
  items: OrderItem[];
  total_amount: number;
  fulfillment_status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  customer_email: string;
  customer_name: string;
  shipping_address: ShippingAddress | null;
  currency: string;
}

interface ProductionModeProps {
  orders: Order[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onMarkComplete: (orderId: string) => void;
  onSkip: () => void;
}

export function ProductionMode({ 
  orders, 
  currentIndex, 
  onClose, 
  onNext, 
  onPrevious,
  onMarkComplete,
  onSkip
}: ProductionModeProps) {
  const currentOrder = orders[currentIndex];
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [currentSide, setCurrentSide] = useState<'front' | 'back'>('front');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [completedPatches, setCompletedPatches] = useState<Set<string>>(new Set());
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset item index when order changes
  useEffect(() => {
    setCurrentItemIndex(0);
    setCurrentSide('front');
    setCompletedPatches(new Set());
  }, [currentIndex]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollBarCompensation = window.innerWidth - document.documentElement.clientWidth;
    
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollBarCompensation}px`;
    
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrevious();
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        setCurrentSide(prev => prev === 'front' ? 'back' : 'front');
      }
      if (e.key === 'Enter' && currentOrder) {
        onMarkComplete(currentOrder.id);
      }
      if (e.key === 'f') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentOrder, onNext, onPrevious, onClose, onMarkComplete]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (!currentOrder) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 text-center max-w-md border border-gray-700">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h2 className="text-2xl font-bold mb-2 text-white">All Caught Up!</h2>
          <p className="text-gray-400 mb-6">No more orders to process</p>
          <button onClick={onClose} className="px-6 py-3 bg-pink text-white rounded-xl font-medium hover:bg-pink/90">
            Exit Production Mode
          </button>
        </div>
      </div>
    );
  }

  const currentItem = currentOrder.items[currentItemIndex];
  const patches = currentSide === 'front' 
    ? (currentItem?.frontPatches || [])
    : (currentItem?.backPatches || []);
  const displayImage = currentSide === 'front' 
    ? (currentItem?.productImage || '/placeholder-product.png')
    : (currentItem?.productBackImage || currentItem?.productImage || '/placeholder-product.png');

  const totalItems = currentOrder.items.reduce((sum, item) => sum + item.qty, 0);
  const totalPatches = currentOrder.items.reduce((sum, item) => 
    sum + (item.frontPatches?.length || 0) + (item.backPatches?.length || 0), 0
  );

  // Get upcoming orders (next 5)
  const upcomingOrders = orders.slice(currentIndex + 1, currentIndex + 6);

  // Format address
  const formatAddress = (addr: ShippingAddress | null) => {
    if (!addr) return 'No shipping address';
    const parts = [
      addr.name,
      addr.address_line1,
      addr.address_line2,
      `${addr.city}, ${addr.state || ''} ${addr.postal_code}`,
      addr.country
    ].filter(Boolean);
    return parts.join(', ');
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] bg-black/90"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      <div className="w-full h-full flex items-center justify-center p-4">
        <div 
          ref={modalRef}
          className="bg-gray-900 rounded-xl shadow-2xl w-[95vw] h-[95vh] flex flex-col overflow-hidden border border-gray-700"
        >
          {/* Header */}
          <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-white font-bold text-lg">
                  Order #{currentOrder.order_number}
                </h2>
                <p className="text-gray-400 text-sm">
                  {currentIndex + 1} of {orders.length} orders • {totalItems} items • {totalPatches} patches
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Side Toggle */}
              <div className="flex bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setCurrentSide('front')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentSide === 'front' 
                      ? 'bg-pink text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Front
                </button>
                <button
                  onClick={() => setCurrentSide('back')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentSide === 'back' 
                      ? 'bg-pink text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Back
                </button>
              </div>

              <button
                onClick={() => setShowMeasurements(!showMeasurements)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showMeasurements ? 'bg-pink text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Ruler
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors"
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onPrevious}
                disabled={currentIndex === 0}
                className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <span className="text-white font-mono font-medium min-w-[60px] text-center">
                {currentIndex + 1} / {orders.length}
              </span>
              <button
                onClick={onNext}
                disabled={currentIndex === orders.length - 1}
                className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Left - Product Canvas (75%) */}
            <div className="w-[75%] bg-gray-900 p-6 flex items-center justify-center">
              <div className="relative max-w-2xl w-full">
                <div className="relative flex items-center justify-center">
                  <img
                    src={displayImage}
                    alt={currentItem?.name}
                    className="max-w-full max-h-[70vh] object-contain"
                  />

                  {/* Grid Overlay */}
                  {showMeasurements && (
                    <div className="absolute inset-0 pointer-events-none">
                      {Array.from({ length: 21 }).map((_, i) => (
                        <div
                          key={`v-${i}`}
                          className="absolute top-0 bottom-0 border-l border-dashed border-pink/30"
                          style={{ left: `${i * 5}%` }}
                        />
                      ))}
                      {Array.from({ length: 21 }).map((_, i) => (
                        <div
                          key={`h-${i}`}
                          className="absolute left-0 right-0 border-t border-dashed border-pink/30"
                          style={{ top: `${i * 5}%` }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Patches - Positioned exactly as in CustomizePage */}
                  {patches.map((patch, idx) => {
                    const isCompleted = completedPatches.has(`${currentSide}-${idx}`);
                    // Calculate content zone center for transform origin (same as CustomizePage)
                    const cz = patch.contentZone || { x: 0, y: 0, width: 100, height: 100 };
                    const cx = cz.x + cz.width / 2;
                    const cy = cz.y + cz.height / 2;
                    
                    return (
                      <div
                        key={idx}
                        className="absolute cursor-pointer group"
                        style={{
                          left: `${patch.x}%`,
                          top: `${patch.y}%`,
                          width: `${patch.widthPercent}%`,
                          height: `${patch.heightPercent}%`,
                          transform: `rotate(${patch.rotation}deg)`,
                          transformOrigin: `${cx}% ${cy}%`,
                        }}
                        onClick={() => {
                          const newCompleted = new Set(completedPatches);
                          if (newCompleted.has(`${currentSide}-${idx}`)) {
                            newCompleted.delete(`${currentSide}-${idx}`);
                          } else {
                            newCompleted.add(`${currentSide}-${idx}`);
                          }
                          setCompletedPatches(newCompleted);
                        }}
                      >
                        <img
                          src={patch.image}
                          alt={patch.name}
                          className={`w-full h-full object-contain drop-shadow-lg transition-all ${
                            isCompleted ? 'opacity-50 grayscale' : ''
                          }`}
                          style={{
                            clipPath: patch.contentZone
                              ? (patch.contentZone.type === 'polygon' && patch.contentZone.points
                                ? `polygon(${patch.contentZone.points.map((p: {x: number, y: number}) => `${p.x}% ${p.y}%`).join(', ')})`
                                : `inset(${patch.contentZone.y}% ${100 - (patch.contentZone.x + patch.contentZone.width)}% ${100 - (patch.contentZone.y + patch.contentZone.height)}% ${patch.contentZone.x}%)`)
                              : 'none'
                          }}
                        />
                        
                        {/* Patch Number - positioned at content zone center */}
                        <div 
                          className={`absolute w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-colors ${
                            isCompleted 
                              ? 'bg-green-500 text-white' 
                              : 'bg-pink text-white'
                          }`}
                          style={{
                            left: `${cx}%`,
                            top: `${cy}%`,
                            transform: 'translate(-50%, -50%)'
                          }}
                        >
                          {isCompleted ? '✓' : idx + 1}
                        </div>

                        {/* Tooltip */}
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {patch.name}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Scale indicator */}
                {showMeasurements && (
                  <div className="mt-4 flex items-center gap-2 text-gray-400 text-sm justify-center">
                    <div className="w-20 h-0.5 bg-pink" />
                    <span>5cm (reference)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right - Sidebar (25%) */}
            <div className="w-[25%] bg-gray-800 border-l border-gray-700 flex flex-col min-h-0">
              {/* Shipping Details */}
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-bold text-white flex items-center gap-2 mb-3 text-sm">
                  <Package className="w-4 h-4 text-pink" />
                  Shipping Details
                </h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-white">{currentOrder.customer_name}</p>
                      <p className="text-gray-400 text-xs">{currentOrder.customer_email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-300 text-xs leading-relaxed">
                      {formatAddress(currentOrder.shipping_address)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400 text-xs">
                      Ordered {new Date(currentOrder.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-bold text-white text-sm mb-2">Current Item</h3>
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-white text-sm">{currentItem?.name}</span>
                    <span className="text-gray-400 text-xs">x{currentItem?.qty}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Item {currentItemIndex + 1} of {currentOrder.items.length}
                  </div>
                </div>
              </div>

              {/* Patch Checklist */}
              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                <h4 className="text-gray-400 text-xs font-medium mb-3 uppercase tracking-wide">
                  {currentSide} Patches ({patches.length})
                </h4>
                <div className="space-y-2">
                  {patches.map((patch, idx) => {
                    const isCompleted = completedPatches.has(`${currentSide}-${idx}`);
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          const newCompleted = new Set(completedPatches);
                          if (newCompleted.has(`${currentSide}-${idx}`)) {
                            newCompleted.delete(`${currentSide}-${idx}`);
                          } else {
                            newCompleted.add(`${currentSide}-${idx}`);
                          }
                          setCompletedPatches(newCompleted);
                        }}
                        className={`p-2 rounded-lg cursor-pointer flex items-center gap-3 transition-colors ${
                          isCompleted 
                            ? 'bg-green-500/20 border border-green-500/50' 
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isCompleted ? 'bg-green-500 text-white' : 'bg-pink text-white'
                        }`}>
                          {isCompleted ? '✓' : idx + 1}
                        </div>
                        <img src={patch.image} alt={patch.name} className="w-8 h-8 object-contain flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${isCompleted ? 'text-green-400 line-through' : 'text-white'}`}>
                            {patch.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {patch.x.toFixed(1)}%, {patch.y.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {patches.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No patches on {currentSide} side
                  </p>
                )}
              </div>

              {/* Upcoming Queue */}
              <div className="p-4 border-t border-gray-700 bg-gray-800 max-h-32 overflow-y-auto">
                <h4 className="text-gray-400 text-xs font-medium mb-2 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Up Next ({orders.length - currentIndex - 1})
                </h4>
                
                {upcomingOrders.length > 0 ? (
                  <div className="space-y-1">
                    {upcomingOrders.map((order) => (
                      <div 
                        key={order.id}
                        className="text-xs text-gray-300 bg-gray-700 px-2 py-1.5 rounded"
                      >
                        <span className="font-medium">#{order.order_number}</span>
                        <span className="text-gray-500 ml-2">
                          {order.items.reduce((sum, item) => sum + item.qty, 0)} items
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs">No more orders</p>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-gray-700 space-y-2 flex-shrink-0">
                <button
                  onClick={() => onMarkComplete(currentOrder.id)}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Complete
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={onSkip}
                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <SkipForward className="w-4 h-4 inline mr-1" />
                    Skip
                  </button>
                  <button
                    onClick={onPrevious}
                    disabled={currentIndex === 0}
                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 inline mr-1" />
                    Back
                  </button>
                </div>

                {/* Keyboard shortcuts */}
                <div className="text-xs text-gray-500 text-center pt-1">
                  Press <kbd className="bg-gray-700 px-1 rounded">Enter</kbd> to complete
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

export default ProductionMode;
