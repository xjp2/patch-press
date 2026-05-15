import { useRef, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ZoomIn, ZoomOut, RotateCcw, RotateCw,
    Trash2, ShoppingCart,
    Sparkles, Maximize2, Grid3X3,
    ChevronRight, ChevronLeft, Check, Flame, X, Search,
    Package, Layers
} from 'lucide-react';
import { playPop, playClick, playWhoosh, playDing, playSnap } from './lib/sounds';
import { StepTransition, PatchBurst, FloatingDecorations, FreshPatchGlow } from './components/DesignEffects';
import { ProductCard } from './components/ProductCard';
import { MotionStep } from './components/MotionStep';
import { PatchFlight } from './components/PatchFlight';
import type { FlyingPatch } from './components/PatchFlight';
import { HeatPressSequence } from './components/HeatPressSequence';
import type { Product, Patch, SiteContent } from './AdminPanel';
import { useCart } from './context/CartContext';
import { useCurrency } from './context/CurrencyContext';
import { getClipAndCenter, fixImagePath, getResizedImageUrl } from './lib/utils';
import { CroppedThumbnail } from './components/CroppedThumbnail';

// Helper for Point in Polygon (Ray Casting)
const isPointInPolygon = (x: number, y: number, points: { x: number, y: number }[]) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].x, yi = points[i].y;
        const xj = points[j].x, yj = points[j].y;
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

// Helper for Distance from Point to Line Segment
const getClosestPointOnSegment = (p: { x: number, y: number }, a: { x: number, y: number }, b: { x: number, y: number }) => {
    const atob = { x: b.x - a.x, y: b.y - a.y };
    const atop = { x: p.x - a.x, y: p.y - a.y };
    const len = atob.x * atob.x + atob.y * atob.y;
    const dot = atop.x * atob.x + atop.y * atob.y;
    const t = Math.min(1, Math.max(0, dot / len));
    return { x: a.x + atob.x * t, y: a.y + atob.y * t };
};

// Helper for Closest Point on Polygon
const getClosestPointOnPolygon = (p: { x: number, y: number }, points: { x: number, y: number }[]) => {
    let minDist = Infinity;
    let closest = p;

    for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        const pt = getClosestPointOnSegment(p, a, b);
        const dist = (p.x - pt.x) ** 2 + (p.y - pt.y) ** 2;
        if (dist < minDist) {
            minDist = dist;
            closest = pt;
        }
    }
    return closest;
};

export interface PlacedPatch extends Patch {
    uniqueId: string;
    x: number; // Percentage (0-100) relative to product image
    y: number; // Percentage (0-100) relative to product image
    rotation: number;
    widthPercent: number; // Percentage of product image width
    heightPercent: number; // Percentage of product image height
}

type DesignStep = 'product' | 'design' | 'review';
type AppView = 'landing' | 'customize';

interface CustomizePageProps {
    products: Product[];
    patches: Patch[];
    setCurrentView: (view: AppView) => void;
    siteContent: SiteContent;
}



// Confetti colors for review step
const confettiColors = ['#81c784', '#ffd54f', '#f06292', '#64b5f6', '#ba68c8'];

// Deterministic pseudo-random for confetti
const confettiLeftValues = Array.from({ length: 20 }, (_, i) => {
    const x = Math.sin(i * 9301 + 49297) % 1;
    return (x < 0 ? x + 1 : x) * 100;
});

// Confetti particle component
const ConfettiParticle = ({ delay, color, index }: { delay: number, color: string, index: number }) => (
    <div 
        className="absolute w-2 h-2 rounded-full"
        style={{
            backgroundColor: color,
            animation: `confetti-fall 1s ${delay}ms ease-out forwards`,
            left: `${confettiLeftValues[index % confettiLeftValues.length]}%`,
            top: '-10px'
        }}
    />
);

const categories = [{ id: 'all', name: 'All' }, { id: 'food', name: 'Food' }, { id: 'characters', name: 'Characters' }, { id: 'letters', name: 'Letters' }, { id: 'symbols', name: 'Symbols' }];

export function CustomizePage({ products, patches, setCurrentView, siteContent }: CustomizePageProps) {
    const { addItem, syncCart } = useCart();
    const { formatPrice, currency } = useCurrency();
    const [currentStep, setCurrentStep] = useState<DesignStep>('product');
    const [selectedProduct, setSelectedProduct] = useState<Product>(products[0]);

    // When a new product is selected, clear all placed patches
    const selectProduct = (product: Product) => {
        playClick();
        if (product.id !== selectedProduct.id) {
            setFrontPatches([]);
            setBackPatches([]);
            setSelectedPatchId(null);
            setShowBackSide(false);
        }
        setSelectedProduct(product);
    };
    const [showBackSide, setShowBackSide] = useState(false);
    const [frontPatches, setFrontPatches] = useState<PlacedPatch[]>([]);
    const [backPatches, setBackPatches] = useState<PlacedPatch[]>([]);

    // Derived state
    const placedPatches = showBackSide ? backPatches : frontPatches;


    const [selectedCategory, setSelectedCategory] = useState('all');
    const [patchSearch, setPatchSearch] = useState('');
    const [isHeatPressing, setIsHeatPressing] = useState(false);
    const [heatPressPhase, setHeatPressPhase] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);

    const [zoom, setZoom] = useState(1);
    const [showOnboarding, setShowOnboarding] = useState(true);
    // Creative effects state
    const [showStepTransition, setShowStepTransition] = useState(false);
    const [patchBursts, setPatchBursts] = useState<Array<{id: string, x: number, y: number}>>([]);
    const [freshPatchId, setFreshPatchId] = useState<string | null>(null);
    const [flyingPatches, setFlyingPatches] = useState<FlyingPatch[]>([]);

    // Drag & Drop State
    const [selectedPatchId, setSelectedPatchId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [rotationStart, setRotationStart] = useState({ x: 0, y: 0, rotation: 0 });
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [showPlacementZone, setShowPlacementZone] = useState(false);

    const canvasRef = useRef<HTMLDivElement>(null);
    const productImageRef = useRef<HTMLImageElement>(null);
    const reviewRef = useRef<HTMLDivElement>(null);
    const heatPressTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

    // Auto-dismiss onboarding after 6s or when user places first patch
    useEffect(() => {
        if (frontPatches.length > 0 || backPatches.length > 0) setShowOnboarding(false);
    }, [frontPatches.length, backPatches.length]);
    useEffect(() => {
        if (currentStep === 'design' && showOnboarding) {
            const t = setTimeout(() => setShowOnboarding(false), 6000);
            return () => clearTimeout(t);
        }
    }, [currentStep, showOnboarding]);

    const searchFiltered = patchSearch.trim() ? patches.filter(p => p.name.toLowerCase().includes(patchSearch.toLowerCase())) : patches;
    const filteredPatches = selectedCategory === 'all' ? searchFiltered : searchFiltered.filter(p => p.category === selectedCategory);

    // Combined front + back totals
    const frontPatchesPrice = frontPatches.reduce((sum, p) => sum + p.price, 0);
    const backPatchesPrice = backPatches.reduce((sum, p) => sum + p.price, 0);
    const allPatchesPrice = frontPatchesPrice + backPatchesPrice;
    const totalPrice = selectedProduct.basePrice + allPatchesPrice;

    // --- Actions ---

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
    const resetView = () => { setZoom(1); setPanOffset({ x: 0, y: 0 }); };



    const addPatch = (patch: Patch, clickX?: number, clickY?: number) => {
        playPop();
        const img = productImageRef.current;
        if (!img) return;
        const rect = img.getBoundingClientRect();
        const canvasRect = canvasRef.current?.getBoundingClientRect();

        // Trigger patch flight animation
        if (clickX !== undefined && clickY !== undefined && canvasRect) {
            const flightId = uuidv4();
            setFlyingPatches(prev => [...prev, {
                id: flightId,
                image: patch.image,
                startX: clickX,
                startY: clickY,
                endX: canvasRect.left + canvasRect.width / 2,
                endY: canvasRect.top + canvasRect.height / 2,
                size: 48,
            }]);
        }

        // Zone calculations relative to the rendered image
        const zone = selectedProduct.placementZone;
        const zoneX = (zone.x / 100) * rect.width;
        const zoneY = (zone.y / 100) * rect.height;
        const zoneW = (zone.width / 100) * rect.width;
        const zoneH = (zone.height / 100) * rect.height;

        // Center in zone
        const centerX = (zoneX + zoneW / 2) / rect.width * 100; // Convert to percentage
        const centerY = (zoneY + zoneH / 2) / rect.height * 100; // Convert to percentage

        // Default patch size (e.g., 10% of product image width, maintaining aspect ratio)
        const defaultPatchWidthPercent = 10;
        const patchAspectRatio = patch.height > 0 ? patch.width / patch.height : 1;
        const defaultPatchHeightPercent = patchAspectRatio > 0 
            ? defaultPatchWidthPercent / patchAspectRatio * (rect.width / rect.height) 
            : defaultPatchWidthPercent; // Adjust height based on product image aspect ratio

        const newPatch: PlacedPatch = {
            ...patch,
            uniqueId: uuidv4(),
            x: centerX,
            y: centerY,
            widthPercent: defaultPatchWidthPercent,
            heightPercent: defaultPatchHeightPercent,
            rotation: 0
        };

        if (showBackSide) { setBackPatches(prev => [...prev, newPatch]); }
        else { setFrontPatches(prev => [...prev, newPatch]); }
        setSelectedPatchId(newPatch.uniqueId);
        setFreshPatchId(newPatch.uniqueId);
        setTimeout(() => setFreshPatchId(null), 900);

        // Trigger particle burst at click position if available
        if (clickX !== undefined && clickY !== undefined) {
            const burstId = uuidv4();
            setPatchBursts(prev => [...prev, { id: burstId, x: clickX, y: clickY }]);
        }
    };

    const handleFlightComplete = (id: string) => {
        setFlyingPatches(prev => prev.filter(f => f.id !== id));
    };

    const deleteSelectedPatch = () => {
        if (!selectedPatchId) return;
        const updatePatches = showBackSide ? setBackPatches : setFrontPatches;
        updatePatches(prev => prev.filter(p => p.uniqueId !== selectedPatchId));
        setSelectedPatchId(null);
    };

    const deletePatch = (uniqueId: string) => {
        const updatePatches = showBackSide ? setBackPatches : setFrontPatches;
        updatePatches(prev => prev.filter(p => p.uniqueId !== uniqueId));
        if (selectedPatchId === uniqueId) setSelectedPatchId(null);
    };

    const clearAllPatches = () => {
        const updatePatches = showBackSide ? setBackPatches : setFrontPatches;
        updatePatches([]);
        setSelectedPatchId(null);
    };

    const handleHeatPress = () => {
        if (placedPatches.length === 0) return;
        setIsHeatPressing(true);
        setHeatPressPhase(1); // Lowering press
        
        // Store timeout IDs for cleanup
        heatPressTimeouts.current = [
            setTimeout(() => setHeatPressPhase(2), 1000), // Applying heat
            setTimeout(() => setHeatPressPhase(3), 2800), // Cooling down
            setTimeout(() => setHeatPressPhase(4), 3800), // Done flash
            setTimeout(() => {
                setIsHeatPressing(false);
                setHeatPressPhase(0);
                setCurrentStep('review');
            }, 4300)
        ];
    };
    
    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            heatPressTimeouts.current.forEach((id) => clearTimeout(id));
            heatPressTimeouts.current = [];
        };
    }, []);

    const handleAddToCart = () => {
        playDing();
        // Create cart item from current design with full patch placement data
        const cartItem = {
            id: uuidv4(),
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            name: selectedProduct.name,
            productImage: selectedProduct.frontImage,
            productBackImage: selectedProduct.backImage,
            basePrice: selectedProduct.basePrice,
            frontPatches: frontPatches.map(p => ({
                id: p.id,
                name: p.name,
                image: p.image,
                price: p.price,
                x: p.x,
                y: p.y,
                rotation: p.rotation,
                widthPercent: p.widthPercent,
                heightPercent: p.heightPercent,
                contentZone: p.contentZone
            })),
            backPatches: backPatches.map(p => ({
                id: p.id,
                name: p.name,
                image: p.image,
                price: p.price,
                x: p.x,
                y: p.y,
                rotation: p.rotation,
                widthPercent: p.widthPercent,
                heightPercent: p.heightPercent,
                contentZone: p.contentZone
            })),
            totalPrice: totalPrice,
            placementZone: selectedProduct.placementZone,
            width: selectedProduct.width,
            height: selectedProduct.height,
            designImage: undefined // Could generate preview image here
        };
        addItem(cartItem);
        // Explicitly sync to ensure cart is saved
        setTimeout(() => syncCart(), 100);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    const startNewDesign = () => {
        setFrontPatches([]);
        setBackPatches([]);
        setSelectedPatchId(null);
        setZoom(1);
        setPanOffset({ x: 0, y: 0 });
        setShowBackSide(false);
        setCurrentStep('product');
        setCurrentView('landing');
        setShowSuccess(false);
    };

    // --- Interaction Handlers ---

    const startDragPatch = (e: React.MouseEvent | React.TouchEvent, uniqueId: string) => {
        e.stopPropagation();
        e.preventDefault();
        const patch = placedPatches.find(p => p.uniqueId === uniqueId);
        const img = productImageRef.current;
        if (!patch || !img) return;

        setSelectedPatchId(uniqueId);
        setIsDragging(true);

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const rect = img.getBoundingClientRect();

        const xPercent = ((clientX - rect.left) / rect.width) * 100;
        const yPercent = ((clientY - rect.top) / rect.height) * 100;

        setDragOffset({
            x: xPercent - patch.x,
            y: yPercent - patch.y
        });
    };

    const startRotatePatch = (e: React.MouseEvent | React.TouchEvent, uniqueId: string) => {
        e.stopPropagation();
        e.preventDefault();
        const patch = placedPatches.find(p => p.uniqueId === uniqueId);
        if (!patch) return;

        setSelectedPatchId(uniqueId);
        setIsRotating(true);

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        setRotationStart({ x: clientX, y: clientY, rotation: patch.rotation });
    };

    const startPan = (e: React.MouseEvent | React.TouchEvent) => {
        if ((e.target as HTMLElement).closest('.patch-item')) return;
        e.preventDefault();
        setSelectedPatchId(null);

        setIsPanning(true);

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        setPanStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
    };

    const handleGoToDesign = () => {
        playWhoosh();
        setShowStepTransition(true);
    };

    const handleTransitionComplete = useCallback(() => {
        setShowStepTransition(false);
        setCurrentStep('design');
    }, []);

    // --- Global Resize/Move Listener ---

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            const img = productImageRef.current;
            if (!img) return;
            const imgRect = img.getBoundingClientRect();

            if (isDragging && selectedPatchId) {
                const patch = placedPatches.find(p => p.uniqueId === selectedPatchId);
                if (!patch) return;

                const currentXPercent = ((clientX - imgRect.left) / imgRect.width) * 100;
                const currentYPercent = ((clientY - imgRect.top) / imgRect.height) * 100;

                let newX = currentXPercent - dragOffset.x;
                let newY = currentYPercent - dragOffset.y;

                const zone = selectedProduct.placementZone;

                if (zone.type === 'polygon' && zone.points && zone.points.length > 0) {
                    const cz = patch.contentZone || { x: 50, y: 50, width: 0, height: 0 };
                    const czCenterX_pctOfPatch = cz.x + (cz.width / 2);
                    const czCenterY_pctOfPatch = cz.y + (cz.height / 2);

                    const offsetX_prodPct = (czCenterX_pctOfPatch / 100) * patch.widthPercent;
                    const offsetY_prodPct = (czCenterY_pctOfPatch / 100) * patch.heightPercent;

                    let interactionX = newX + offsetX_prodPct;
                    let interactionY = newY + offsetY_prodPct;

                    if (!isPointInPolygon(interactionX, interactionY, zone.points)) {
                        const snapped = getClosestPointOnPolygon({ x: interactionX, y: interactionY }, zone.points);
                        interactionX = snapped.x;
                        interactionY = snapped.y;
                    }

                    newX = interactionX - offsetX_prodPct;
                    newY = interactionY - offsetY_prodPct;
                } else {
                    // Rect Logic
                    const cz = patch.contentZone || { x: 50, y: 50, width: 0, height: 0 };
                    const czCenterX_pctOfPatch = cz.x + (cz.width / 2);
                    const czCenterY_pctOfPatch = cz.y + (cz.height / 2);

                    const offsetX_prodPct = (czCenterX_pctOfPatch / 100) * patch.widthPercent;
                    const offsetY_prodPct = (czCenterY_pctOfPatch / 100) * patch.heightPercent;

                    let interactionX = newX + offsetX_prodPct;
                    let interactionY = newY + offsetY_prodPct;

                    // Clamp
                    interactionX = Math.max(zone.x, Math.min(zone.x + zone.width, interactionX));
                    interactionY = Math.max(zone.y, Math.min(zone.y + zone.height, interactionY));

                    newX = interactionX - offsetX_prodPct;
                    newY = interactionY - offsetY_prodPct;
                }

                const updatePatches = showBackSide ? setBackPatches : setFrontPatches;
                updatePatches(prev => prev.map(p => p.uniqueId === selectedPatchId ? { ...p, x: newX, y: newY } : p));
            }



            if (isRotating && selectedPatchId) {
                const patch = placedPatches.find(p => p.uniqueId === selectedPatchId);
                if (!patch) return;

                // Pivot is the Content Center (Transform Origin)
                const cz = patch.contentZone || { x: 50, y: 50, width: 0, height: 0 };
                const czCenterX_pctOfPatch = cz.x + (cz.width / 2);
                const czCenterY_pctOfPatch = cz.y + (cz.height / 2);

                const offsetX_prodPct = (czCenterX_pctOfPatch / 100) * patch.widthPercent;
                const offsetY_prodPct = (czCenterY_pctOfPatch / 100) * patch.heightPercent;

                const pivotX = imgRect.left + ((patch.x + offsetX_prodPct) / 100) * imgRect.width;
                const pivotY = imgRect.top + ((patch.y + offsetY_prodPct) / 100) * imgRect.height;

                const startAngle = Math.atan2(rotationStart.y - pivotY, rotationStart.x - pivotX);
                const currentAngle = Math.atan2(clientY - pivotY, clientX - pivotX);
                const angleDiff = (currentAngle - startAngle) * (180 / Math.PI);

                const updatePatches = showBackSide ? setBackPatches : setFrontPatches;
                updatePatches(prev => prev.map(p => p.uniqueId === selectedPatchId ? { ...p, rotation: Math.round((rotationStart.rotation + angleDiff) / 5) * 5 } : p));
            }

            if (isPanning) {
                setPanOffset({ x: clientX - panStart.x, y: clientY - panStart.y });
            }
        };

        const handleEnd = () => {
            if (isDragging) playSnap();
            setIsDragging(false);
            setIsRotating(false);
            setIsPanning(false);
        };

        if (isDragging || isRotating || isPanning) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('touchmove', handleMove);
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchend', handleEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging, isRotating, isPanning, selectedPatchId, dragOffset, rotationStart, panStart, placedPatches, showBackSide, selectedProduct]);

    // --- Sub-components (could be separate files, keeping here for now as they are specific) ---

    const StepIndicator = () => (
        <div className="flex items-center justify-center gap-4 mb-8">
            {/* ... same implementation ... */}
            <div className={`flex items-center gap-2 ${currentStep === 'product' ? 'opacity-100' : 'opacity-50'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep === 'product' ? 'bg-craft-mint text-white' : 'bg-cardstock text-ink-muted'}`}>1</div>
                <span className="font-semibold hidden sm:block">Pick Base</span>
            </div>
            <div className="w-12 h-1 bg-cardstock rounded"><div className={`h-full bg-craft-mint rounded transition-all duration-500 ${currentStep === 'product' ? 'w-0' : currentStep === 'design' ? 'w-1/2' : 'w-full'}`} /></div>
            <div className={`flex items-center gap-2 ${currentStep === 'design' ? 'opacity-100' : 'opacity-50'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep === 'design' ? 'bg-craft-mint text-white' : 'bg-cardstock text-ink-muted'}`}>2</div>
                <span className="font-semibold hidden sm:block">Add Patches</span>
            </div>
            <div className="w-12 h-1 bg-cardstock rounded"><div className={`h-full bg-craft-mint rounded transition-all duration-500 ${currentStep === 'review' ? 'w-full' : 'w-0'}`} /></div>
            <div className={`flex items-center gap-2 ${currentStep === 'review' ? 'opacity-100' : 'opacity-50'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep === 'review' ? 'bg-craft-mint text-white' : 'bg-cardstock text-ink-muted'}`}>3</div>
                <span className="font-semibold hidden sm:block">Done!</span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-paper pb-8 pt-20 px-4">
            <style>{`
                @keyframes pop-in {
                    0% { transform: scale(0) rotate(-10deg); opacity: 0; }
                    70% { transform: scale(1.05) rotate(2deg); }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                @keyframes confetti-fall {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
                @keyframes fade-scale-up {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes slide-in-right {
                    from { transform: translateX(30px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slide-in-left {
                    from { transform: translateX(-30px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .animate-pop-in { animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                .animate-fade-scale-up { animation: fade-scale-up 0.4s ease-out forwards; }
                .animate-slide-in-right { animation: slide-in-right 0.4s ease-out forwards; }
                .animate-slide-in-left { animation: slide-in-left 0.4s ease-out forwards; }
                .animate-fly-in-elastic { animation: fly-in-elastic 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                .animate-selected-ring-pulse { animation: selected-ring-pulse 0.6s ease-out forwards; }
                .animate-sparkle-pop { animation: sparkle-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            `}</style>
            <div className="max-w-7xl mx-auto">
                <StepIndicator />

                <AnimatePresence mode="wait">
                {/* STEP 1: Product Selection */}
                {currentStep === 'product' && (
                    <MotionStep key="product" stepKey="product" direction="right">
                        <div className="text-center mb-8">
                            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-ink mb-2">{siteContent.customizePage.step1Title}</h2>
                            <p className="text-ink/60">{siteContent.customizePage.step1Subtitle}</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                            {products.map((product, index) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    isSelected={selectedProduct.id === product.id}
                                    onClick={() => selectProduct(product)}
                                    index={index}
                                />
                            ))}
                        </div>
                        <div className="text-center animate-slide-in-right" style={{ animationDelay: `${products.length * 80}ms`, opacity: 0 }}>
                            <button onClick={handleGoToDesign} className="btn-primary text-lg px-12 hover:scale-105 active:scale-95 transition-transform relative group">
                                Continue to Design
                                <ChevronRight className="w-5 h-5 inline ml-2 transition-transform group-hover:translate-x-1" />
                                {/* Button shimmer effect */}
                                <span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                                    <span className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                </span>
                            </button>
                        </div>
                    </MotionStep>
                )}

                {/* STEP 2: Design */}
                {currentStep === 'design' && (
                    <MotionStep key="design" stepKey="design" direction="right">
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Left Panel: Patches */}
                            <div className="lg:w-1/4 order-2 lg:order-1 animate-slide-in-left">
                                <div className="bg-cardstock rounded-2xl p-4 shadow-soft">
                                    <h3 className="font-heading text-lg font-bold text-ink mb-3 flex items-center gap-2"><Sparkles className="w-5 h-5 text-craft-mint" /> Patch Collection <span className="text-sm font-normal text-ink/50">({filteredPatches.length})</span></h3>
                                    <div className="relative mb-3">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
                                        <input
                                            type="text"
                                            placeholder="Search patches..."
                                            value={patchSearch}
                                            onChange={(e) => setPatchSearch(e.target.value)}
                                            className="w-full pl-9 pr-8 py-2 rounded-xl bg-cardstock border border-transparent focus:border-craft-mint focus:outline-none text-sm placeholder:text-ink/40 transition-all focus:shadow-[0_0_12px_rgba(129,199,132,0.25)]"
                                        />
                                        {patchSearch && (
                                            <button onClick={() => setPatchSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-text-dark/10 flex items-center justify-center hover:bg-text-dark/20 transition-colors">
                                                <X className="w-3 h-3 text-ink/60" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {categories.map(cat => (
                                            <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); }} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedCategory === cat.id ? 'bg-craft-mint text-white' : 'bg-cardstock text-ink hover:bg-craft-mint/20'}`}>{cat.name}</button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 max-h-[300px] sm:max-h-[400px] overflow-y-auto p-1">
                                        {filteredPatches.length > 0 ? filteredPatches.map((patch) => (
                                            <motion.button
                                                key={patch.id}
                                                onClick={(e) => {
                                                    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                                    addPatch(patch, rect.left + rect.width / 2, rect.top + rect.height / 2);
                                                }}
                                                className="bg-cardstock rounded-xl p-2 hover:bg-craft-mint/20 text-center"
                                                whileHover={{ scale: 1.08 }}
                                                whileTap={{ scale: 0.88 }}
                                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                            >
                                                <img src={getResizedImageUrl(patch.image, 200)} alt={patch.name} className="w-full aspect-square object-contain mb-1" loading="lazy" decoding="async" style={(() => {
                                                    const s = getClipAndCenter(patch.contentZone);
                                                    return { clipPath: s.clipPath, transform: s.transform };
                                                })()} />
                                                <p className="text-[10px] font-semibold text-ink truncate">{patch.name}</p>
                                                <p className="text-[10px] text-craft-mint">{formatPrice(patch.price)}</p>
                                            </motion.button>
                                        )) : (
                                            <div className="col-span-3 py-8 text-center text-ink/40">
                                                <Search className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                                <p className="font-semibold text-sm">No patches found</p>
                                                <p className="text-xs mt-1">Try a different search or category</p>
                                                <button onClick={() => { setPatchSearch(''); setSelectedCategory('all'); }} className="mt-3 text-xs text-craft-mint hover:underline">Clear filters</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Center Panel: Canvas */}
                            <div className="lg:w-2/4 order-1 lg:order-2 animate-fade-scale-up" style={{ animationDelay: '100ms' }}>
                                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleZoomOut} className="p-2 bg-cardstock rounded-lg shadow-sm hover:bg-craft-mint/20"><ZoomOut className="w-5 h-5" /></button>
                                        <span className="text-sm font-semibold w-16 text-center">{Math.round(zoom * 100)}%</span>
                                        <button onClick={handleZoomIn} className="p-2 bg-cardstock rounded-lg shadow-sm hover:bg-craft-mint/20"><ZoomIn className="w-5 h-5" /></button>
                                        <button onClick={resetView} className="p-2 bg-cardstock rounded-lg shadow-sm hover:bg-craft-mint/20" title="Reset View"><Maximize2 className="w-5 h-5" /></button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setShowPlacementZone(!showPlacementZone)} className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-sm ${showPlacementZone ? 'bg-craft-mint text-white' : 'bg-cardstock hover:bg-craft-mint/20'}`} title="Show Placement Zone"><Grid3X3 className="w-4 h-4" /></button>
                                        <button onClick={() => setShowBackSide(!showBackSide)} className="flex items-center gap-2 px-3 py-2 bg-cardstock rounded-lg shadow-sm hover:bg-craft-mint/20"><RotateCw className="w-4 h-4" /><span className="text-sm font-semibold">{showBackSide ? 'Back' : 'Front'}</span></button>

                                        <button onClick={deleteSelectedPatch} disabled={!selectedPatchId} className="p-2 bg-craft-pink/10 rounded-lg shadow-sm hover:bg-craft-pink/20 disabled:opacity-50"><Trash2 className="w-5 h-5 text-craft-pink" /></button>
                                    </div>
                                </div>

                                <div className="relative bg-paper-grid rounded-[1.25rem] overflow-hidden border-[2.5px] border-ink shadow-paper cursor-grab active:cursor-grabbing" style={{ height: '500px' }} onMouseDown={startPan} onTouchStart={startPan}>
                                    <div className="absolute inset-0 grid-pattern opacity-50" />
                                    <FloatingDecorations />
                                    <div ref={canvasRef} className={`absolute inset-0 flex items-center justify-center transition-transform duration-100 ${isHeatPressing ? 'animate-heat-press' : ''}`} style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, transformOrigin: 'center center' }}>
                                        {(() => {
                                            const s = getClipAndCenter(selectedProduct.placementZone);
                                            return (
                                                <div className="relative" style={{ transform: s.transform }}>
                                                    {/* Product Image */}
                                                    <motion.img
                                                        ref={productImageRef}
                                                        src={showBackSide ? selectedProduct.backImage : selectedProduct.frontImage}
                                                        alt={selectedProduct.name}
                                                        className="max-w-full max-h-[450px] object-contain"
                                                        draggable={false}
                                                        style={{ clipPath: s.clipPath }}
                                                        animate={freshPatchId ? {
                                                            scale: [1, 1.015, 1, 1.008, 1],
                                                        } : {}}
                                                        transition={{ duration: 0.4, ease: 'easeInOut' }}
                                                    />

                                                    {/* Placement Zone Overlay (Visual only, logic is in handleMove) */}
                                            {showPlacementZone && (
                                                selectedProduct.placementZone.type === 'polygon' && selectedProduct.placementZone.points ? (
                                                    <div className="absolute inset-0 pointer-events-none">
                                                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                            <defs>
                                                                <mask id="poly-mask-customize">
                                                                    <rect x="0" y="0" width="100" height="100" fill="white" />
                                                                    <path d={`M${selectedProduct.placementZone.points[0].x},${selectedProduct.placementZone.points[0].y} ${selectedProduct.placementZone.points.slice(1).map(p => `L${p.x},${p.y}`).join(' ')} Z`} fill="black" />
                                                                </mask>
                                                            </defs>
                                                            <path
                                                                d={`M0,0 L100,0 L100,100 L0,100 Z M${selectedProduct.placementZone.points[0].x},${selectedProduct.placementZone.points[0].y} ${selectedProduct.placementZone.points.slice(1).map(p => `L${p.x},${p.y}`).join(' ')} Z`}
                                                                fill="rgba(0,0,0,0.5)"
                                                                fillRule="evenodd"
                                                            />
                                                            <path
                                                                d={`M${selectedProduct.placementZone.points[0].x},${selectedProduct.placementZone.points[0].y} ${selectedProduct.placementZone.points.slice(1).map(p => `L${p.x},${p.y}`).join(' ')} Z`}
                                                                fill="none"
                                                                stroke="#81c784"
                                                                strokeWidth="0.5"
                                                                strokeDasharray="1 1"
                                                                vectorEffect="non-scaling-stroke"
                                                            />
                                                        </svg>
                                                        <div
                                                            className="absolute bg-craft-mint text-white text-xs px-2 py-1 rounded"
                                                            style={{
                                                                left: `${selectedProduct.placementZone.points.reduce((min, p) => Math.min(min, p.x), 100)}%`,
                                                                top: `${Math.max(0, selectedProduct.placementZone.points.reduce((min, p) => Math.min(min, p.y), 100) - 5)}%`
                                                            }}
                                                        >
                                                            Placement Zone
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="absolute border-2 border-dashed border-brass pointer-events-none"
                                                        style={{
                                                            left: `${selectedProduct.placementZone.x}%`,
                                                            top: `${selectedProduct.placementZone.y}%`,
                                                            width: `${selectedProduct.placementZone.width}%`,
                                                            height: `${selectedProduct.placementZone.height}%`
                                                        }}
                                                    >
                                                        <div className="absolute -top-6 left-0 bg-craft-mint text-white text-xs px-2 py-1 rounded">Placement Zone</div>
                                                    </div>
                                                )
                                            )}

                                            {/* Patches - Visuals & Interaction (Unified Layer) */}
                                            {placedPatches.map((patch) => {
                                                const cz = patch.contentZone || { x: 0, y: 0, width: 100, height: 100 };
                                                const cx = cz.x + cz.width / 2;
                                                const cy = cz.y + cz.height / 2;

                                                const isFresh = patch.uniqueId === freshPatchId;
                                                return (
                                                    <motion.div
                                                        key={patch.uniqueId}
                                                        className={`patch-item absolute ${selectedPatchId === patch.uniqueId ? 'z-50' : 'z-10'}`}
                                                        style={{
                                                            left: `${patch.x}%`,
                                                            top: `${patch.y}%`,
                                                            width: `${patch.widthPercent}%`,
                                                            height: `${patch.heightPercent}%`,
                                                            transformOrigin: `${cx}% ${cy}%`,
                                                            rotate: patch.rotation,
                                                        }}
                                                        initial={isFresh ? { scale: 0, rotate: patch.rotation - 15 } : false}
                                                        animate={{
                                                            scale: isFresh ? 1 : selectedPatchId === patch.uniqueId ? 1.05 : 1,
                                                            rotate: patch.rotation,
                                                        }}
                                                        transition={{
                                                            scale: { type: 'spring', stiffness: 400, damping: 20 },
                                                            rotate: { duration: 0 },
                                                        }}
                                                    >
                                                        <img
                                                            src={patch.image}
                                                            alt={patch.name}
                                                            className={`w-full h-full object-contain drop-shadow-lg cursor-move ${selectedPatchId === patch.uniqueId ? 'brightness-110' : ''}`}
                                                            style={{
                                                                clipPath: patch.contentZone
                                                                    ? (patch.contentZone.type === 'polygon' && patch.contentZone.points
                                                                        ? `polygon(${patch.contentZone.points.map(p => `${p.x}% ${p.y}%`).join(', ')})`
                                                                        : `inset(${patch.contentZone.y}% ${100 - (patch.contentZone.x + patch.contentZone.width)}% ${100 - (patch.contentZone.y + patch.contentZone.height)}% ${patch.contentZone.x}%)`)
                                                                    : 'none'
                                                            }}
                                                            draggable={false}
                                                            onMouseDown={(e) => startDragPatch(e, patch.uniqueId)}
                                                            onTouchStart={(e) => startDragPatch(e, patch.uniqueId)}
                                                            onClick={(e) => { e.stopPropagation(); setSelectedPatchId(patch.uniqueId); }}
                                                        />
                                                        {isFresh && <FreshPatchGlow active={isFresh} />}
                                                        {selectedPatchId === patch.uniqueId && (
                                                            <>
                                                                {/* Traced Zone Overlay - Semi-transparent fill with border */}
                                                                <div className="absolute inset-0 pointer-events-none" style={{ margin: '-4px' }}>
                                                                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                                        {patch.contentZone && patch.contentZone.type === 'polygon' && patch.contentZone.points ? (
                                                                            <>
                                                                                {/* Filled background */}
                                                                                <polygon points={patch.contentZone.points.map(p => `${p.x},${p.y}`).join(' ')}
                                                                                    fill="rgba(129, 199, 132, 0.15)" stroke="none" />
                                                                                {/* Dashed border */}
                                                                                <polygon points={patch.contentZone.points.map(p => `${p.x},${p.y}`).join(' ')}
                                                                                    stroke="#81c784" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" strokeDasharray="4 2" />
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                {/* Filled background */}
                                                                                <rect x={patch.contentZone ? patch.contentZone.x : 0}
                                                                                    y={patch.contentZone ? patch.contentZone.y : 0}
                                                                                    width={patch.contentZone ? patch.contentZone.width : 100}
                                                                                    height={patch.contentZone ? patch.contentZone.height : 100}
                                                                                    fill="rgba(129, 199, 132, 0.15)" stroke="none" rx="1" />
                                                                                {/* Dashed border */}
                                                                                <rect x={patch.contentZone ? patch.contentZone.x : 0}
                                                                                    y={patch.contentZone ? patch.contentZone.y : 0}
                                                                                    width={patch.contentZone ? patch.contentZone.width : 100}
                                                                                    height={patch.contentZone ? patch.contentZone.height : 100}
                                                                                    stroke="#81c784" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" strokeDasharray="4 2" rx="1" />
                                                                            </>
                                                                        )}
                                                                    </svg>
                                                                </div>
                                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing"
                                                                    style={{
                                                                        left: `${cx}%`,
                                                                        top: `${cz.y}%`,
                                                                        transform: 'translate(-50%, -100%)'
                                                                    }}
                                                                    onMouseDown={(e) => startRotatePatch(e, patch.uniqueId)}
                                                                    onTouchStart={(e) => startRotatePatch(e, patch.uniqueId)}>
                                                                    <div className="w-6 h-6 bg-craft-mint rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"><RotateCw className="w-3 h-3 text-white" /></div>
                                                                    <div className="absolute top-6 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-craft-mint" />
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); deletePatch(patch.uniqueId); }}
                                                                    style={{
                                                                        left: `${cz.x + cz.width}%`,
                                                                        top: `${cz.y}%`,
                                                                        transform: 'translate(50%, -50%)'
                                                                    }}
                                                                    className="absolute w-6 h-6 bg-craft-pink text-white rounded-full flex items-center justify-center shadow-lg hover:bg-craft-pink-light"><X className="w-4 h-4" /></button>
                                                            </>
                                                        )}

                                                    </motion.div>
                                                );
                                            })}

                                            <AnimatePresence>
                                                {isHeatPressing && <HeatPressSequence phase={heatPressPhase} />}
                                            </AnimatePresence>

                                            </div>
                                        );
                                    })()}


                                </div>
                            </div>

                                <div className="flex justify-between items-center mt-4">
                                    <button onClick={() => setCurrentStep('product')} className="flex items-center gap-2 px-4 py-2 text-ink/70 hover:text-ink"><ChevronLeft className="w-4 h-4" /> Back</button>
                                    <div className="flex gap-3">
                                        <button onClick={clearAllPatches} className="flex items-center gap-2 px-4 py-2 text-craft-pink hover:bg-craft-pink/10 rounded-full" disabled={placedPatches.length === 0}><RotateCcw className="w-4 h-4" /> Clear All</button>
                                        <button onClick={handleHeatPress} className="btn-primary flex items-center gap-2" disabled={placedPatches.length === 0 || isHeatPressing}><Flame className="w-5 h-5" /> {isHeatPressing ? 'Pressing...' : 'Heat Press'}</button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel: Instructions + Placed Patches + Price */}
                            <div className="lg:w-1/4 order-3 animate-slide-in-right">
                                <div className="bg-cardstock rounded-2xl p-4 shadow-soft">
                                    <h3 className="font-heading text-lg font-bold text-ink mb-4">{siteContent.customizePage.step2PanelTitle}</h3>
                                    <div className="space-y-3 text-sm">
                                        {siteContent.customizePage.howToDesignSteps.map((step, i) => (
                                            <div key={i} className="flex items-start gap-3"><div className="w-6 h-6 bg-craft-mint/20 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-craft-mint font-bold text-xs">{i + 1}</span></div><p className="text-ink/70">{step}</p></div>
                                        ))}
                                    </div>
                                </div>

                                {/* Placed Patches List */}
                                {placedPatches.length > 0 && (
                                    <div className="bg-cardstock rounded-2xl p-4 mt-4 shadow-soft">
                                        <h3 className="font-heading text-sm font-bold text-ink mb-3 flex items-center gap-2">
                                            <Layers className="w-4 h-4 text-craft-mint" /> Placed Patches ({placedPatches.length})
                                        </h3>
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                            {placedPatches.map((patch) => (
                                                <div
                                                    key={patch.uniqueId}
                                                    onClick={() => setSelectedPatchId(patch.uniqueId)}
                                                    className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-colors ${
                                                        selectedPatchId === patch.uniqueId ? 'bg-craft-mint/20 ring-1 ring-craft-mint' : 'hover:bg-paper'
                                                    }`}
                                                >
                                                    <img src={getResizedImageUrl(patch.image, 64)} alt={patch.name} className="w-8 h-8 object-contain flex-shrink-0" loading="lazy" decoding="async" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold truncate">{patch.name}</p>
                                                        <p className="text-[10px] text-craft-mint">{formatPrice(patch.price)}</p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deletePatch(patch.uniqueId); }}
                                                        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-craft-pink/20 text-craft-pink flex-shrink-0"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Design Summary & Total Cost — Combined Both Sides */}
                                <div className="bg-gradient-to-br from-craft-mint/15 via-craft-mint/10 to-cardstock rounded-2xl p-4 mt-4 shadow-soft border border-craft-mint/20">
                                    <h3 className="font-heading font-bold text-ink mb-3 flex items-center gap-2">
                                        <ShoppingCart className="w-4 h-4 text-craft-mint" /> Design Total
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center"><span className="text-ink/70">{selectedProduct.name}</span><span className="font-semibold">{formatPrice(selectedProduct.basePrice)}</span></div>
                                        {frontPatches.length > 0 && (
                                            <div className="flex justify-between items-center"><span className="text-ink/70">Front ({frontPatches.length} patch{frontPatches.length !== 1 ? 'es' : ''})</span><span className="font-semibold">{formatPrice(frontPatchesPrice)}</span></div>
                                        )}
                                        {backPatches.length > 0 && (
                                            <div className="flex justify-between items-center"><span className="text-ink/70">Back ({backPatches.length} patch{backPatches.length !== 1 ? 'es' : ''})</span><span className="font-semibold">{formatPrice(backPatchesPrice)}</span></div>
                                        )}
                                        {frontPatches.length === 0 && backPatches.length === 0 && (
                                            <div className="flex justify-between items-center text-ink/40 italic"><span>No patches yet</span><span>{formatPrice(0)}</span></div>
                                        )}
                                        <div className="border-t border-craft-mint/30 pt-2 mt-1">
                                            <div className="flex justify-between font-bold text-xl"><span>Total</span><motion.span
                                                key={totalPrice + currency}
                                                initial={{ scale: 1.1 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                                className="text-craft-mint"
                                            >{formatPrice(totalPrice)}</motion.span></div>
                                            <p className="text-[10px] text-ink/40 text-right mt-0.5">Converted using current exchange rates</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </MotionStep>
                )}

                {/* STEP 3: Review */}
                {currentStep === 'review' && (
                    <MotionStep key="review" stepKey="review" direction="up">
                        {/* Confetti */}
                        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                            {confettiColors.map((color, i) => (
                                <ConfettiParticle key={i} delay={i * 100} color={color} index={i} />
                            ))}
                        </div>

                        <div className="bg-cardstock rounded-3xl p-4 sm:p-6 shadow-soft">
                            {/* Compact header */}
                            <div className="text-center mb-3">
                                <h2 className="font-heading text-xl sm:text-2xl font-bold text-ink flex items-center justify-center gap-2">
                                    <Check className="w-6 h-6 text-craft-mint" />
                                    {siteContent.customizePage.step3Title}
                                </h2>
                                <p className="text-ink/60 text-xs">{siteContent.customizePage.step3Subtitle}</p>
                            </div>

                            {/* Horizontal layout: preview left, summary right */}
                            <div className="flex flex-col lg:flex-row gap-6 mb-4">
                                {/* Previews */}
                                <div ref={reviewRef} className="flex-1 grid grid-cols-2 gap-4 items-start">
                                    {/* Front View */}
                                    <div className="relative bg-white/60 rounded-xl p-3 shadow-sm">
                                        <h4 className="text-xs font-bold text-center text-ink/40 mb-2">Front</h4>
                                        {(() => {
                                            const s = getClipAndCenter(selectedProduct.placementZone);
                                            return (
                                                <div className="relative mx-auto" style={{ maxWidth: 260, transform: s.transform }}>
                                                    <img src={fixImagePath(selectedProduct.frontImage)} alt={`${selectedProduct.name} Front`} className="w-full object-contain" style={{ clipPath: s.clipPath }} />
                                                    {frontPatches.map((patch) => {
                                                        const cz = patch.contentZone || { x: 0, y: 0, width: 100, height: 100 };
                                                        const cx = cz.x + cz.width / 2;
                                                        const cy = cz.y + cz.height / 2;
                                                        return (
                                                            <img key={patch.uniqueId} src={fixImagePath(patch.image)} alt={patch.name} className="absolute object-contain" style={{
                                                                left: `${patch.x}%`, top: `${patch.y}%`, width: `${patch.widthPercent}%`, height: `${patch.heightPercent}%`,
                                                                transform: `rotate(${patch.rotation}deg)`,
                                                                transformOrigin: `${cx}% ${cy}%`,
                                                                clipPath: patch.contentZone
                                                                    ? (patch.contentZone.type === 'polygon' && patch.contentZone.points
                                                                        ? `polygon(${patch.contentZone.points.map(p => `${p.x}% ${p.y}%`).join(', ')})`
                                                                        : `inset(${patch.contentZone.y}% ${100 - (patch.contentZone.x + patch.contentZone.width)}% ${100 - (patch.contentZone.y + patch.contentZone.height)}% ${patch.contentZone.x}%)`)
                                                                    : 'none'
                                                            }} />
                                                        )
                                                    })}
                                                </div>
                                            );
                                        })()}
                                        <p className="text-center text-[10px] text-ink/40 mt-2">{frontPatches.length} patch{frontPatches.length !== 1 ? 'es' : ''}</p>
                                    </div>

                                    {/* Back View */}
                                    <div className="relative bg-white/60 rounded-xl p-3 shadow-sm">
                                        <h4 className="text-xs font-bold text-center text-ink/40 mb-2">Back</h4>
                                        {(() => {
                                            const s = getClipAndCenter(selectedProduct.placementZone);
                                            return (
                                                <div className="relative mx-auto" style={{ maxWidth: 260, transform: s.transform }}>
                                                    <img src={fixImagePath(selectedProduct.backImage)} alt={`${selectedProduct.name} Back`} className="w-full object-contain" style={{ clipPath: s.clipPath }} />
                                                    {backPatches.map((patch) => {
                                                        const cz = patch.contentZone || { x: 0, y: 0, width: 100, height: 100 };
                                                        const cx = cz.x + cz.width / 2;
                                                        const cy = cz.y + cz.height / 2;
                                                        return (
                                                            <img key={patch.uniqueId} src={fixImagePath(patch.image)} alt={patch.name} className="absolute object-contain" style={{
                                                                left: `${patch.x}%`, top: `${patch.y}%`, width: `${patch.widthPercent}%`, height: `${patch.heightPercent}%`,
                                                                transform: `rotate(${patch.rotation}deg)`,
                                                                transformOrigin: `${cx}% ${cy}%`,
                                                                clipPath: patch.contentZone
                                                                    ? (patch.contentZone.type === 'polygon' && patch.contentZone.points
                                                                        ? `polygon(${patch.contentZone.points.map(p => `${p.x}% ${p.y}%`).join(', ')})`
                                                                        : `inset(${patch.contentZone.y}% ${100 - (patch.contentZone.x + patch.contentZone.width)}% ${100 - (patch.contentZone.y + patch.contentZone.height)}% ${patch.contentZone.x}%)`)
                                                                    : 'none'
                                                            }} />
                                                        )
                                                    })}
                                                </div>
                                            );
                                        })()}
                                        <p className="text-center text-[10px] text-ink/40 mt-2">{backPatches.length} patch{backPatches.length !== 1 ? 'es' : ''}</p>
                                    </div>
                                </div>

                                {/* Summary + Buttons */}
                                <div className="lg:w-72 flex flex-col gap-3">
                                    {/* Itemized Summary */}
                                    <div className="bg-gradient-to-br from-cardstock via-craft-mint/5 to-cardstock rounded-xl p-3 border border-craft-mint/15">
                                        <h4 className="font-heading font-bold text-ink text-sm mb-2 flex items-center gap-1"><Package className="w-3 h-3 text-craft-mint" /> Your Design</h4>

                                        {/* Base product */}
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-ink/10">
                                            <div className="w-10 h-10 rounded bg-white/50 overflow-hidden flex-shrink-0">
                                                <CroppedThumbnail
                                                    src={fixImagePath(selectedProduct.frontImage)}
                                                    zone={selectedProduct.placementZone}
                                                    className="w-full h-full"
                                                    imgClassName="object-contain"
                                                    alt={selectedProduct.name}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-ink truncate">{selectedProduct.name}</p>
                                                <p className="text-[10px] text-ink/50">Base item</p>
                                            </div>
                                            <span className="text-xs font-semibold">{formatPrice(selectedProduct.basePrice)}</span>
                                        </div>

                                        {/* Front patches */}
                                        {frontPatches.length > 0 && (
                                            <div className="mb-2 pb-2 border-b border-ink/10">
                                                <p className="text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-1">Front Patches</p>
                                                {frontPatches.map(p => (
                                                    <div key={p.uniqueId} className="flex items-center gap-2 py-0.5">
                                                        <img src={getResizedImageUrl(fixImagePath(p.image), 48)} alt={p.name} className="w-6 h-6 object-contain" loading="lazy" decoding="async" />
                                                        <span className="flex-1 text-xs text-ink/70 truncate">{p.name}</span>
                                                        <span className="text-xs font-medium">{formatPrice(p.price)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Back patches */}
                                        {backPatches.length > 0 && (
                                            <div className="mb-2 pb-2 border-b border-ink/10">
                                                <p className="text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-1">Back Patches</p>
                                                {backPatches.map(p => (
                                                    <div key={p.uniqueId} className="flex items-center gap-2 py-0.5">
                                                        <img src={getResizedImageUrl(fixImagePath(p.image), 48)} alt={p.name} className="w-6 h-6 object-contain" loading="lazy" decoding="async" />
                                                        <span className="flex-1 text-xs text-ink/70 truncate">{p.name}</span>
                                                        <span className="text-xs font-medium">{formatPrice(p.price)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Total */}
                                        <div className="flex justify-between items-center pt-1">
                                            <span className="text-sm font-bold">Total</span>
                                            <span className="text-lg font-bold text-craft-mint">{formatPrice(totalPrice)}</span>
                                        </div>
                                    </div>

                                    {/* Buttons */}
                                    <button onClick={handleAddToCart} className="btn-primary w-full flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-transform animate-pulse text-sm py-2.5"><ShoppingCart className="w-4 h-4" /> Add to Cart</button>
                                    <div className="flex gap-2">
                                        <button onClick={() => setCurrentStep('design')} className="flex-1 btn-secondary flex items-center justify-center gap-1 hover:scale-105 transition-transform text-xs py-2"><RotateCcw className="w-3 h-3" /> Edit Design</button>
                                    </div>
                                    <button onClick={startNewDesign} className="text-craft-mint hover:underline text-xs block mx-auto hover:scale-105 transition-transform">Start New Design</button>
                                </div>
                            </div>
                        </div>
                    </MotionStep>
                )}
                </AnimatePresence>


                {/* Step Transition Overlay */}
                <StepTransition
                    show={showStepTransition}
                    productImage={selectedProduct.frontImage}
                    productName={selectedProduct.name}
                    placementZone={selectedProduct.placementZone}
                    onComplete={handleTransitionComplete}
                />

                {/* Patch Burst Particles */}
                <PatchBurst bursts={patchBursts} onBurstEnd={(id) => setPatchBursts(prev => prev.filter(b => b.id !== id))} />

                {/* Patch Flight Animation */}
                <PatchFlight flights={flyingPatches} onComplete={handleFlightComplete} />

                {showSuccess && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm">
                        <div className="bg-cardstock rounded-3xl p-8 text-center animate-bounce-in shadow-2xl">
                            <div className="w-20 h-20 bg-craft-mint rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-10 h-10 text-white" /></div>
                            <h3 className="font-heading text-2xl font-bold text-ink">Added to Cart!</h3>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
