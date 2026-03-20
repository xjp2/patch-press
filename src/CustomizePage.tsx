import { useRef, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
    ZoomIn, ZoomOut, RotateCcw, RotateCw,
    Trash2, ShoppingCart,
    Sparkles, Maximize2, Grid3X3,
    ChevronRight, ChevronLeft, Check, Flame, X, MousePointer2, Search,
    Download, Package, Eye
} from 'lucide-react';
import type { Product, Patch, SiteContent } from './AdminPanel';
import { useCart } from './context/CartContext';

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
    let dot = atop.x * atob.x + atop.y * atob.y;
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

// Helper: compute clipPath + centering transform from a zone
const getClipAndCenter = (zone: any) => {
    if (!zone) return { clipPath: 'none' as string, transform: 'none' as string };
    let clipPath: string;
    let cx: number, cy: number;
    if (zone.type === 'polygon' && zone.points && zone.points.length > 0) {
        clipPath = `polygon(${zone.points.map((p: { x: number, y: number }) => `${p.x}% ${p.y}%`).join(', ')})`;
        // Compute bounding-box center of polygon
        const xs = zone.points.map((p: { x: number, y: number }) => p.x);
        const ys = zone.points.map((p: { x: number, y: number }) => p.y);
        cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    } else {
        clipPath = `inset(${zone.y}% ${100 - (zone.x + zone.width)}% ${100 - (zone.y + zone.height)}% ${zone.x}%)`;
        cx = zone.x + zone.width / 2;
        cy = zone.y + zone.height / 2;
    }
    // Shift so the crop center sits at the element center
    const tx = 50 - cx;
    const ty = 50 - cy;
    return { clipPath, transform: `translate(${tx}%, ${ty}%)` };
};

// Confetti colors for review step
const confettiColors = ['#ec4899', '#f472b6', '#fbbf24', '#60a5fa', '#a78bfa'];

// Confetti particle component
const ConfettiParticle = ({ delay, color }: { delay: number, color: string }) => (
    <div 
        className="absolute w-2 h-2 rounded-full"
        style={{
            backgroundColor: color,
            animation: `confetti-fall 1s ${delay}ms ease-out forwards`,
            left: `${Math.random() * 100}%`,
            top: '-10px'
        }}
    />
);

const categories = [{ id: 'all', name: 'All' }, { id: 'food', name: 'Food' }, { id: 'characters', name: 'Characters' }, { id: 'letters', name: 'Letters' }, { id: 'symbols', name: 'Symbols' }];

export function CustomizePage({ products, patches, setCurrentView, siteContent }: CustomizePageProps) {
    const { addItem, syncCart } = useCart();
    const [currentStep, setCurrentStep] = useState<DesignStep>('product');
    const [selectedProduct, setSelectedProduct] = useState<Product>(products[0]);

    // When a new product is selected, clear all placed patches
    const selectProduct = (product: Product) => {
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
    const [showPreview, setShowPreview] = useState(false);
    const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');
    const [zoom, setZoom] = useState(1);
    const [showOnboarding, setShowOnboarding] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

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



    const addPatch = (patch: Patch) => {
        const img = productImageRef.current;
        if (!img) return;
        const rect = img.getBoundingClientRect();

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

    const handlePreview = () => {
        if (frontPatches.length === 0 && backPatches.length === 0) return;
        setPreviewSide('front');
        setShowPreview(true);
    };

    const handleAddToCart = () => {
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
            designImage: undefined // Could generate preview image here
        };
        addItem(cartItem);
        // Explicitly sync to ensure cart is saved
        setTimeout(() => syncCart(), 100);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    // Download design as PNG
    const downloadDesign = async () => {
        if (!reviewRef.current) return;
        setIsDownloading(true);
        try {
            // Use html2canvas-like approach with native canvas
            const el = reviewRef.current;
            const canvas = document.createElement('canvas');
            const scale = 2;
            canvas.width = el.offsetWidth * scale;
            canvas.height = el.offsetHeight * scale;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.scale(scale, scale);
            ctx.fillStyle = '#f5f5f5';
            ctx.fillRect(0, 0, el.offsetWidth, el.offsetHeight);

            // Render product images and patches for both sides
            const sides = [
                { label: 'Front', image: selectedProduct.frontImage, patches: frontPatches, xOffset: 20 },
                { label: 'Back', image: selectedProduct.backImage, patches: backPatches, xOffset: el.offsetWidth / 2 + 10 },
            ];
            const imgSize = Math.min(el.offsetWidth / 2 - 40, 280);
            const yStart = 50;

            ctx.font = 'bold 18px Quicksand, sans-serif';
            ctx.fillStyle = '#4A4A4A';
            ctx.textAlign = 'center';
            ctx.fillText(`${selectedProduct.name} — Custom Design`, el.offsetWidth / 2, 30);

            for (const side of sides) {
                ctx.font = 'bold 14px Quicksand, sans-serif';
                ctx.fillStyle = '#999';
                ctx.textAlign = 'center';
                ctx.fillText(side.label, side.xOffset + imgSize / 2, yStart - 5);

                const img = new Image();
                img.crossOrigin = 'anonymous';
                await new Promise<void>((resolve) => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    img.src = side.image;
                });
                ctx.drawImage(img, side.xOffset, yStart, imgSize, imgSize);

                for (const patch of side.patches) {
                    const pImg = new Image();
                    pImg.crossOrigin = 'anonymous';
                    await new Promise<void>((resolve) => {
                        pImg.onload = () => resolve();
                        pImg.onerror = () => resolve();
                        pImg.src = patch.image;
                    });
                    const px = side.xOffset + (patch.x / 100) * imgSize;
                    const py = yStart + (patch.y / 100) * imgSize;
                    const pw = (patch.widthPercent / 100) * imgSize;
                    const ph = (patch.heightPercent / 100) * imgSize;
                    ctx.save();
                    ctx.translate(px + pw / 2, py + ph / 2);
                    ctx.rotate((patch.rotation * Math.PI) / 180);
                    ctx.drawImage(pImg, -pw / 2, -ph / 2, pw, ph);
                    ctx.restore();
                }
            }

            // Total price
            ctx.font = 'bold 16px Nunito, sans-serif';
            ctx.fillStyle = '#FFB6C1';
            ctx.textAlign = 'center';
            ctx.fillText(`Total: $${totalPrice}`, el.offsetWidth / 2, yStart + imgSize + 30);

            const link = document.createElement('a');
            link.download = `${selectedProduct.name.replace(/\s+/g, '-')}-custom-design.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Download failed:', err);
        } finally {
            setIsDownloading(false);
        }
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

        setIsPanning(true);

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        setPanStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
    };

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
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep === 'product' ? 'bg-pink text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                <span className="font-semibold hidden sm:block">Pick Base</span>
            </div>
            <div className="w-12 h-1 bg-gray-200 rounded"><div className={`h-full bg-pink rounded transition-all duration-500 ${currentStep === 'product' ? 'w-0' : currentStep === 'design' ? 'w-1/2' : 'w-full'}`} /></div>
            <div className={`flex items-center gap-2 ${currentStep === 'design' ? 'opacity-100' : 'opacity-50'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep === 'design' ? 'bg-pink text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                <span className="font-semibold hidden sm:block">Add Patches</span>
            </div>
            <div className="w-12 h-1 bg-gray-200 rounded"><div className={`h-full bg-pink rounded transition-all duration-500 ${currentStep === 'review' ? 'w-full' : 'w-0'}`} /></div>
            <div className={`flex items-center gap-2 ${currentStep === 'review' ? 'opacity-100' : 'opacity-50'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep === 'review' ? 'bg-pink text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
                <span className="font-semibold hidden sm:block">Done!</span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-cream pb-8 pt-20 px-4">
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
                .animate-pop-in { animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                .animate-fade-scale-up { animation: fade-scale-up 0.4s ease-out forwards; }
                .animate-slide-in-right { animation: slide-in-right 0.4s ease-out forwards; }
                .animate-slide-in-left { animation: slide-in-left 0.4s ease-out forwards; }
            `}</style>
            <div className="max-w-7xl mx-auto">
                <StepIndicator />

                {/* STEP 1: Product Selection */}
                {currentStep === 'product' && (
                    <div className="animate-fade-scale-up">
                        <div className="text-center mb-8">
                            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-text-dark mb-2">{siteContent.customizePage.step1Title}</h2>
                            <p className="text-text-dark/60">{siteContent.customizePage.step1Subtitle}</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                            {products.map((product, index) => (
                                <div 
                                    key={product.id} 
                                    onClick={() => selectProduct(product)} 
                                    className={`bg-white rounded-2xl p-4 cursor-pointer transition-all duration-300 animate-pop-in ${selectedProduct.id === product.id ? 'ring-4 ring-pink shadow-pink-lg scale-105' : 'hover:shadow-soft hover:scale-102'}`}
                                    style={{ animationDelay: `${index * 80}ms`, opacity: 0 }}
                                >
                                    {(() => {
                                        const s = getClipAndCenter(product.placementZone);
                                        return <img src={product.frontImage} alt={product.name} className="w-full h-24 object-contain mb-3" style={{ clipPath: s.clipPath, transform: s.transform }} />;
                                    })()}
                                    <p className="text-sm font-semibold text-center text-text-dark">{product.name}</p>
                                    <p className="text-sm text-center text-pink font-bold">${product.basePrice}</p>
                                </div>
                            ))}
                        </div>
                        <div className="text-center animate-slide-in-right" style={{ animationDelay: `${products.length * 80}ms`, opacity: 0 }}>
                            <button onClick={() => setCurrentStep('design')} className="btn-primary text-lg px-12 hover:scale-105 active:scale-95 transition-transform">Continue to Design <ChevronRight className="w-5 h-5 inline ml-2" /></button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Design */}
                {currentStep === 'design' && (
                    <div className="animate-fade-scale-up relative">
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Left Panel: Patches */}
                            <div className="lg:w-1/4 order-2 lg:order-1 animate-slide-in-left">
                                <div className="bg-white rounded-2xl p-4 shadow-soft">
                                    <h3 className="font-heading text-lg font-bold text-text-dark mb-3 flex items-center gap-2"><Sparkles className="w-5 h-5 text-pink" /> Patch Collection <span className="text-sm font-normal text-text-dark/50">({filteredPatches.length})</span></h3>
                                    <div className="relative mb-3">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dark/40" />
                                        <input
                                            type="text"
                                            placeholder="Search patches..."
                                            value={patchSearch}
                                            onChange={(e) => setPatchSearch(e.target.value)}
                                            className="w-full pl-9 pr-8 py-2 rounded-xl bg-cream border border-transparent focus:border-pink focus:outline-none text-sm placeholder:text-text-dark/40 transition-colors"
                                        />
                                        {patchSearch && (
                                            <button onClick={() => setPatchSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-text-dark/10 flex items-center justify-center hover:bg-text-dark/20 transition-colors">
                                                <X className="w-3 h-3 text-text-dark/60" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {categories.map(cat => (
                                            <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); }} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedCategory === cat.id ? 'bg-pink text-white' : 'bg-cream text-text-dark hover:bg-pink/20'}`}>{cat.name}</button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 max-h-[300px] sm:max-h-[400px] overflow-y-auto p-1">
                                        {filteredPatches.length > 0 ? filteredPatches.map((patch) => (
                                            <button key={patch.id} onClick={() => addPatch(patch)} className="bg-cream rounded-xl p-2 hover:bg-pink/20 transition-all hover:scale-105 text-center active:scale-95">
                                                <img src={patch.image} alt={patch.name} className="w-full aspect-square object-contain mb-1" style={(() => {
                                                    const s = getClipAndCenter(patch.contentZone);
                                                    return { clipPath: s.clipPath, transform: s.transform };
                                                })()} />
                                                <p className="text-[10px] font-semibold text-text-dark truncate">{patch.name}</p>
                                                <p className="text-[10px] text-pink">${patch.price}</p>
                                            </button>
                                        )) : (
                                            <div className="col-span-3 py-8 text-center text-text-dark/40">
                                                <Search className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                                <p className="font-semibold text-sm">No patches found</p>
                                                <p className="text-xs mt-1">Try a different search or category</p>
                                                <button onClick={() => { setPatchSearch(''); setSelectedCategory('all'); }} className="mt-3 text-xs text-pink hover:underline">Clear filters</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Center Panel: Canvas */}
                            <div className="lg:w-2/4 order-1 lg:order-2 animate-fade-scale-up" style={{ animationDelay: '100ms' }}>
                                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleZoomOut} className="p-2 bg-white rounded-lg shadow-sm hover:bg-pink/20"><ZoomOut className="w-5 h-5" /></button>
                                        <span className="text-sm font-semibold w-16 text-center">{Math.round(zoom * 100)}%</span>
                                        <button onClick={handleZoomIn} className="p-2 bg-white rounded-lg shadow-sm hover:bg-pink/20"><ZoomIn className="w-5 h-5" /></button>
                                        <button onClick={resetView} className="p-2 bg-white rounded-lg shadow-sm hover:bg-pink/20" title="Reset View"><Maximize2 className="w-5 h-5" /></button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setShowPlacementZone(!showPlacementZone)} className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-sm ${showPlacementZone ? 'bg-pink text-white' : 'bg-white hover:bg-pink/20'}`} title="Show Placement Zone"><Grid3X3 className="w-4 h-4" /></button>
                                        <button onClick={() => setShowBackSide(!showBackSide)} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm hover:bg-pink/20"><RotateCw className="w-4 h-4" /><span className="text-sm font-semibold">{showBackSide ? 'Back' : 'Front'}</span></button>
                                        <button onClick={handlePreview} disabled={frontPatches.length === 0 && backPatches.length === 0} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm hover:bg-pink/20 disabled:opacity-40 disabled:cursor-not-allowed" title="Preview Design"><Eye className="w-4 h-4" /><span className="text-sm font-semibold">Preview</span></button>
                                        <button onClick={deleteSelectedPatch} disabled={!selectedPatchId} className="p-2 bg-red-100 rounded-lg shadow-sm hover:bg-red-200 disabled:opacity-50"><Trash2 className="w-5 h-5 text-red-500" /></button>
                                    </div>
                                </div>

                                <div className="relative bg-gray-100 rounded-3xl overflow-hidden shadow-inner cursor-grab active:cursor-grabbing" style={{ height: '500px' }} onMouseDown={startPan} onTouchStart={startPan}>
                                    <div className="absolute inset-0 grid-pattern opacity-50" />
                                    <div ref={canvasRef} className={`absolute inset-0 flex items-center justify-center transition-transform duration-100 ${isHeatPressing ? 'animate-heat-press' : ''}`} style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, transformOrigin: 'center center' }}>
                                        <div className="relative">
                                            {(() => {
                                                const s = getClipAndCenter(selectedProduct.placementZone);
                                                return <img ref={productImageRef} src={showBackSide ? selectedProduct.backImage : selectedProduct.frontImage} alt={selectedProduct.name} className="max-w-full max-h-[450px] object-contain" draggable={false} style={{ clipPath: s.clipPath }} />;
                                            })()}

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
                                                                stroke="#ec4899"
                                                                strokeWidth="0.5"
                                                                strokeDasharray="1 1"
                                                                vectorEffect="non-scaling-stroke"
                                                            />
                                                        </svg>
                                                        <div
                                                            className="absolute bg-pink text-white text-xs px-2 py-1 rounded"
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
                                                        className="absolute border-2 border-dashed border-pink pointer-events-none"
                                                        style={{
                                                            left: `${selectedProduct.placementZone.x}%`,
                                                            top: `${selectedProduct.placementZone.y}%`,
                                                            width: `${selectedProduct.placementZone.width}%`,
                                                            height: `${selectedProduct.placementZone.height}%`
                                                        }}
                                                    >
                                                        <div className="absolute -top-6 left-0 bg-pink text-white text-xs px-2 py-1 rounded">Placement Zone</div>
                                                    </div>
                                                )
                                            )}

                                            {/* Patches - Visuals & Interaction (Unified Layer) */}
                                            {placedPatches.map((patch) => {
                                                const cz = patch.contentZone || { x: 0, y: 0, width: 100, height: 100 };
                                                const cx = cz.x + cz.width / 2;
                                                const cy = cz.y + cz.height / 2;

                                                return (
                                                    <div key={patch.uniqueId} className={`patch-item absolute ${selectedPatchId === patch.uniqueId ? 'z-50' : 'z-10'}`}
                                                        style={{
                                                            left: `${patch.x}%`,
                                                            top: `${patch.y}%`,
                                                            width: `${patch.widthPercent}%`,
                                                            height: `${patch.heightPercent}%`,
                                                            transform: `rotate(${patch.rotation}deg)`,
                                                            transformOrigin: `${cx}% ${cy}%`
                                                        }}>
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
                                                        {selectedPatchId === patch.uniqueId && (
                                                            <>
                                                                {/* Traced Zone Overlay - Semi-transparent fill with border */}
                                                                <div className="absolute inset-0 pointer-events-none" style={{ margin: '-4px' }}>
                                                                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                                        {patch.contentZone && patch.contentZone.type === 'polygon' && patch.contentZone.points ? (
                                                                            <>
                                                                                {/* Filled background */}
                                                                                <polygon points={patch.contentZone.points.map(p => `${p.x},${p.y}`).join(' ')}
                                                                                    fill="rgba(236, 72, 153, 0.15)" stroke="none" />
                                                                                {/* Dashed border */}
                                                                                <polygon points={patch.contentZone.points.map(p => `${p.x},${p.y}`).join(' ')}
                                                                                    stroke="#FF69B4" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" strokeDasharray="4 2" />
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                {/* Filled background */}
                                                                                <rect x={patch.contentZone ? patch.contentZone.x : 0}
                                                                                    y={patch.contentZone ? patch.contentZone.y : 0}
                                                                                    width={patch.contentZone ? patch.contentZone.width : 100}
                                                                                    height={patch.contentZone ? patch.contentZone.height : 100}
                                                                                    fill="rgba(236, 72, 153, 0.15)" stroke="none" rx="1" />
                                                                                {/* Dashed border */}
                                                                                <rect x={patch.contentZone ? patch.contentZone.x : 0}
                                                                                    y={patch.contentZone ? patch.contentZone.y : 0}
                                                                                    width={patch.contentZone ? patch.contentZone.width : 100}
                                                                                    height={patch.contentZone ? patch.contentZone.height : 100}
                                                                                    stroke="#FF69B4" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" strokeDasharray="4 2" rx="1" />
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
                                                                    <div className="w-6 h-6 bg-pink rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"><RotateCw className="w-3 h-3 text-white" /></div>
                                                                    <div className="absolute top-6 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-pink" />
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); deletePatch(patch.uniqueId); }}
                                                                    style={{
                                                                        left: `${cz.x + cz.width}%`,
                                                                        top: `${cz.y}%`,
                                                                        transform: 'translate(50%, -50%)'
                                                                    }}
                                                                    className="absolute w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600"><X className="w-4 h-4" /></button>
                                                            </>
                                                        )}

                                                    </div>
                                                );
                                            })}

                                            {isHeatPressing && (
                                                <div className={`absolute inset-0 z-[100] pointer-events-none ${heatPressPhase === 2 ? 'hp-screen-shake' : ''}`}>
                                                    {/* Dark overlay that intensifies */}
                                                    <div className={`absolute inset-0 transition-all duration-700 ${heatPressPhase >= 2 ? 'bg-black/50' : heatPressPhase >= 1 ? 'bg-black/20' : 'bg-transparent'}`} />

                                                    {/* Pulsing heat glow */}
                                                    <div className={`absolute inset-0 transition-opacity duration-700 ${heatPressPhase >= 2 ? 'opacity-100 hp-glow-pulse' : 'opacity-0'}`}
                                                        style={{ background: 'radial-gradient(ellipse at center, rgba(255,80,0,0.45) 0%, rgba(255,40,0,0.2) 35%, transparent 65%)' }} />

                                                    {/* Metallic press plate — wider, thicker, with reflection stripe */}
                                                    <div className={`absolute left-[5%] right-[5%] transition-all rounded-b-xl
                                                        ${heatPressPhase >= 1 ? 'top-0' : '-top-[80px]'}
                                                        ${heatPressPhase >= 3 ? 'h-[18px] opacity-60' : 'h-[28px]'}
                                                        ${heatPressPhase >= 2 ? 'shadow-[0_6px_40px_rgba(255,80,0,0.8)]' : 'shadow-lg'}`}
                                                        style={{
                                                            transitionDuration: heatPressPhase >= 3 ? '800ms' : '600ms',
                                                            background: heatPressPhase >= 2
                                                                ? 'linear-gradient(to bottom, #555, #444, #FF6B00, #FF4500)'
                                                                : 'linear-gradient(to bottom, #888, #777, #666, #555)'
                                                        }}>
                                                        {/* Reflection stripe */}
                                                        <div className="absolute top-[3px] left-[10%] right-[10%] h-[2px] bg-white/30 rounded-full" />
                                                    </div>

                                                    {/* Side glow bars */}
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-opacity duration-500 ${heatPressPhase >= 2 ? 'opacity-90' : 'opacity-0'}`}
                                                        style={{ background: 'linear-gradient(to bottom, transparent 10%, rgba(255,100,0,0.6) 30%, rgba(255,60,0,0.8) 50%, rgba(255,100,0,0.6) 70%, transparent 90%)' }} />
                                                    <div className={`absolute right-0 top-0 bottom-0 w-1.5 transition-opacity duration-500 ${heatPressPhase >= 2 ? 'opacity-90' : 'opacity-0'}`}
                                                        style={{ background: 'linear-gradient(to bottom, transparent 10%, rgba(255,100,0,0.6) 30%, rgba(255,60,0,0.8) 50%, rgba(255,100,0,0.6) 70%, transparent 90%)' }} />

                                                    {/* Sparks — more, bigger, randomized trajectories */}
                                                    {heatPressPhase >= 2 && heatPressPhase < 3 && [...Array(20)].map((_, i) => (
                                                        <div key={i} className="heat-spark"
                                                            style={{
                                                                left: `${10 + Math.random() * 80}%`,
                                                                top: `${5 + Math.random() * 40}%`,
                                                                animationDelay: `${i * 0.08}s`,
                                                                animationDuration: `${0.5 + Math.random() * 1}s`,
                                                                ['--dx' as string]: `${-20 + Math.random() * 40}px`,
                                                                ['--dy' as string]: `${-30 + Math.random() * 20}px`
                                                            }} />
                                                    ))}

                                                    {/* Ember particles during press */}
                                                    {heatPressPhase === 2 && [...Array(8)].map((_, i) => (
                                                        <div key={`ember-${i}`} className="hp-ember"
                                                            style={{
                                                                left: `${20 + Math.random() * 60}%`,
                                                                top: `${15 + Math.random() * 25}%`,
                                                                animationDelay: `${i * 0.15}s`
                                                            }} />
                                                    ))}

                                                    {/* Steam — larger, more particles during release */}
                                                    {heatPressPhase >= 3 && heatPressPhase < 4 && [...Array(24)].map((_, i) => (
                                                        <div key={i} className="heat-steam"
                                                            style={{ left: `${5 + i * 3.8}%`, animationDelay: `${i * 0.04}s` }} />
                                                    ))}

                                                    {/* Vignette edges */}
                                                    <div className={`absolute inset-0 transition-opacity duration-500 ${heatPressPhase >= 1 ? 'opacity-70' : 'opacity-0'}`}
                                                        style={{ boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)' }} />

                                                    {/* Progress bar — thicker with glow */}
                                                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/20 backdrop-blur-sm">
                                                        <div className="h-full bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 hp-progress-bar shadow-[0_0_12px_rgba(255,160,0,0.8)]" />
                                                    </div>

                                                    {/* Center status — with cycling text */}
                                                    <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-400 ${heatPressPhase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                                                        <div className="text-center">
                                                            {heatPressPhase === 4 ? (
                                                                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce-in shadow-[0_0_30px_rgba(34,197,94,0.6)]">
                                                                    <Check className="w-8 h-8 text-white" />
                                                                </div>
                                                            ) : (
                                                                <Flame className={`w-12 h-12 mx-auto mb-3 drop-shadow-[0_0_20px_rgba(255,100,0,0.9)] ${heatPressPhase >= 2 ? 'text-orange-400 animate-pulse' : 'text-orange-300'}`} />
                                                            )}
                                                            <p className="text-white font-heading font-bold text-lg drop-shadow-lg tracking-wide">
                                                                {heatPressPhase === 1 && 'Lowering press...'}
                                                                {heatPressPhase === 2 && 'Applying heat...'}
                                                                {heatPressPhase === 3 && 'Cooling down...'}
                                                                {heatPressPhase === 4 && 'Done! ✓'}
                                                            </p>
                                                            {heatPressPhase >= 1 && heatPressPhase <= 3 && (
                                                                <p className="text-white/60 text-xs mt-1">Do not remove product</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Success flash on phase 4 */}
                                                    {heatPressPhase === 4 && (
                                                        <div className="absolute inset-0 bg-green-400/20 hp-success-flash" />
                                                    )}
                                                </div>
                                            )}

                                            {placedPatches.length === 0 && !isHeatPressing && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <div className="text-center text-text-dark/30">
                                                        <MousePointer2 className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 animate-bounce" />
                                                        <p className="text-base sm:text-lg font-semibold">Tap patches to add them!</p>
                                                        <p className="text-xs sm:text-sm">Drag to position, rotate using the handle</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mt-4">
                                    <button onClick={() => setCurrentStep('product')} className="flex items-center gap-2 px-4 py-2 text-text-dark/70 hover:text-text-dark"><ChevronLeft className="w-4 h-4" /> Back</button>
                                    <div className="flex gap-3">
                                        <button onClick={clearAllPatches} className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-full" disabled={placedPatches.length === 0}><RotateCcw className="w-4 h-4" /> Clear All</button>
                                        <button onClick={handleHeatPress} className="btn-primary flex items-center gap-2" disabled={placedPatches.length === 0 || isHeatPressing}><Flame className="w-5 h-5" /> {isHeatPressing ? 'Pressing...' : 'Heat Press'}</button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel: Instructions + Price */}
                            <div className="lg:w-1/4 order-3 animate-slide-in-right">
                                <div className="bg-white rounded-2xl p-4 shadow-soft">
                                    <h3 className="font-heading text-lg font-bold text-text-dark mb-4">{siteContent.customizePage.step2PanelTitle}</h3>
                                    <div className="space-y-3 text-sm">
                                        {siteContent.customizePage.howToDesignSteps.map((step, i) => (
                                            <div key={i} className="flex items-start gap-3"><div className="w-6 h-6 bg-pink/20 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-pink font-bold text-xs">{i + 1}</span></div><p className="text-text-dark/70">{step}</p></div>
                                        ))}
                                    </div>
                                </div>
                                {/* Design Summary & Total Cost — Combined Both Sides */}
                                <div className="bg-gradient-to-br from-pink/15 via-pink/10 to-cream rounded-2xl p-4 mt-4 shadow-soft border border-pink/20">
                                    <h3 className="font-heading font-bold text-text-dark mb-3 flex items-center gap-2">
                                        <ShoppingCart className="w-4 h-4 text-pink" /> Design Total
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center"><span className="text-text-dark/70">{selectedProduct.name}</span><span className="font-semibold">${selectedProduct.basePrice}</span></div>
                                        {frontPatches.length > 0 && (
                                            <div className="flex justify-between items-center"><span className="text-text-dark/70">Front ({frontPatches.length} patch{frontPatches.length !== 1 ? 'es' : ''})</span><span className="font-semibold">${frontPatchesPrice}</span></div>
                                        )}
                                        {backPatches.length > 0 && (
                                            <div className="flex justify-between items-center"><span className="text-text-dark/70">Back ({backPatches.length} patch{backPatches.length !== 1 ? 'es' : ''})</span><span className="font-semibold">${backPatchesPrice}</span></div>
                                        )}
                                        {frontPatches.length === 0 && backPatches.length === 0 && (
                                            <div className="flex justify-between items-center text-text-dark/40 italic"><span>No patches yet</span><span>$0</span></div>
                                        )}
                                        <div className="border-t border-pink/30 pt-2 mt-1">
                                            <div className="flex justify-between font-bold text-xl"><span>Total</span><span className="text-pink">${totalPrice}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: Review */}
                {currentStep === 'review' && (
                    <div className="animate-fade-scale-up max-w-3xl mx-auto relative">
                        {/* Confetti */}
                        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                            {confettiColors.map((color, i) => (
                                <ConfettiParticle key={i} delay={i * 100} color={color} />
                            ))}
                        </div>
                        
                        <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-soft">
                            {/* Header */}
                            <div className="text-center mb-6">
                                <div className="w-20 h-20 bg-green/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pop-in">
                                    <Check className="w-10 h-10 text-green-600" />
                                </div>
                                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-text-dark mb-1 animate-slide-in-right">{siteContent.customizePage.step3Title}</h2>
                                <p className="text-text-dark/60 text-sm animate-slide-in-left">{siteContent.customizePage.step3Subtitle}</p>
                            </div>

                            {/* Side-by-side preview - Show full product like design canvas */}
                            <div ref={reviewRef} className="grid grid-cols-2 gap-4 mb-6">
                                {/* Front View */}
                                <div className="relative bg-gray-50 rounded-2xl p-3 sm:p-5">
                                    <h4 className="font-heading text-sm sm:text-base font-bold text-center mb-2 text-text-dark/50">Front</h4>
                                    <div className="relative mx-auto" style={{ maxWidth: 240 }}>
                                        {/* Clipped product image - same as design canvas */}
                                        {(() => {
                                            const s = getClipAndCenter(selectedProduct.placementZone);
                                            return <img src={selectedProduct.frontImage} alt={`${selectedProduct.name} Front`} className="w-full object-contain" style={{ clipPath: s.clipPath, transform: s.transform }} />;
                                        })()}
                                        {/* Patches positioned on full image */}
                                        {frontPatches.map((patch) => {
                                            const cz = patch.contentZone || { x: 0, y: 0, width: 100, height: 100 };
                                            const cx = cz.x + cz.width / 2;
                                            const cy = cz.y + cz.height / 2;
                                            return (
                                                <img key={patch.uniqueId} src={patch.image} alt={patch.name} className="absolute object-contain" style={{
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
                                    <p className="text-center text-xs text-text-dark/40 mt-2">{frontPatches.length} patch{frontPatches.length !== 1 ? 'es' : ''}</p>
                                </div>

                                {/* Back View */}
                                <div className="relative bg-gray-50 rounded-2xl p-3 sm:p-5">
                                    <h4 className="font-heading text-sm sm:text-base font-bold text-center mb-2 text-text-dark/50">Back</h4>
                                    <div className="relative mx-auto" style={{ maxWidth: 240 }}>
                                        {/* Clipped product image - same as design canvas */}
                                        {(() => {
                                            const s = getClipAndCenter(selectedProduct.placementZone);
                                            return <img src={selectedProduct.backImage} alt={`${selectedProduct.name} Back`} className="w-full object-contain" style={{ clipPath: s.clipPath, transform: s.transform }} />;
                                        })()}
                                        {/* Patches positioned on full image */}
                                        {backPatches.map((patch) => {
                                            const cz = patch.contentZone || { x: 0, y: 0, width: 100, height: 100 };
                                            const cx = cz.x + cz.width / 2;
                                            const cy = cz.y + cz.height / 2;
                                            return (
                                                <img key={patch.uniqueId} src={patch.image} alt={patch.name} className="absolute object-contain" style={{
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
                                    <p className="text-center text-xs text-text-dark/40 mt-2">{backPatches.length} patch{backPatches.length !== 1 ? 'es' : ''}</p>
                                </div>
                            </div>

                            {/* Itemized Cost Breakdown */}
                            <div className="bg-gradient-to-br from-cream via-pink/5 to-cream rounded-2xl p-4 mb-6 border border-pink/15">
                                <h4 className="font-heading font-bold text-text-dark mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-pink" /> Order Summary</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-text-dark/70">{selectedProduct.name} (base)</span><span className="font-semibold">${selectedProduct.basePrice}</span></div>
                                    {frontPatches.length > 0 && (
                                        <div>
                                            <div className="flex justify-between"><span className="text-text-dark/70">Front patches × {frontPatches.length}</span><span className="font-semibold">${frontPatchesPrice}</span></div>
                                            <div className="pl-4 mt-1 space-y-0.5">
                                                {frontPatches.map(p => <div key={p.uniqueId} className="flex justify-between text-xs text-text-dark/50"><span>{p.name}</span><span>${p.price}</span></div>)}
                                            </div>
                                        </div>
                                    )}
                                    {backPatches.length > 0 && (
                                        <div>
                                            <div className="flex justify-between"><span className="text-text-dark/70">Back patches × {backPatches.length}</span><span className="font-semibold">${backPatchesPrice}</span></div>
                                            <div className="pl-4 mt-1 space-y-0.5">
                                                {backPatches.map(p => <div key={p.uniqueId} className="flex justify-between text-xs text-text-dark/50"><span>{p.name}</span><span>${p.price}</span></div>)}
                                            </div>
                                        </div>
                                    )}
                                    <div className="border-t border-pink/30 pt-2 mt-2">
                                        <div className="flex justify-between font-bold text-xl"><span>Grand Total</span><span className="text-pink">${totalPrice}</span></div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-center animate-slide-in-right" style={{ animationDelay: '200ms' }}>
                                <button onClick={() => setCurrentStep('design')} className="btn-secondary flex items-center justify-center gap-2 hover:scale-105 transition-transform"><RotateCcw className="w-4 h-4" /> Edit Design</button>
                                <button onClick={downloadDesign} disabled={isDownloading} className="btn-secondary flex items-center justify-center gap-2 hover:scale-105 transition-transform"><Download className="w-4 h-4" /> {isDownloading ? 'Saving...' : 'Save Image'}</button>
                                <button onClick={handleAddToCart} className="btn-primary flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-transform animate-pulse"><ShoppingCart className="w-5 h-5" /> Add to Cart</button>
                            </div>
                            <button onClick={startNewDesign} className="mt-5 text-pink hover:underline text-sm block mx-auto hover:scale-105 transition-transform">Start a New Design</button>
                        </div>
                    </div>
                )}

                {/* ── Preview Modal ── */}
                {showPreview && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowPreview(false)}>
                        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 animate-bounce-in overflow-hidden" onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                <h3 className="font-heading text-lg font-bold text-text-dark">Design Preview</h3>
                                <button onClick={() => setShowPreview(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>

                            {/* Front / Back Toggle */}
                            <div className="flex justify-center gap-2 pt-4 pb-2">
                                <button
                                    onClick={() => setPreviewSide('front')}
                                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${previewSide === 'front' ? 'bg-pink text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >Front</button>
                                <button
                                    onClick={() => setPreviewSide('back')}
                                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${previewSide === 'back' ? 'bg-pink text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >Back</button>
                            </div>

                            {/* Preview Canvas */}
                            <div className="px-6 py-4">
                                <div className="relative mx-auto bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4" style={{ maxWidth: 320 }}>
                                    {(() => {
                                        const s = getClipAndCenter(selectedProduct.placementZone);
                                        const imgSrc = previewSide === 'front' ? selectedProduct.frontImage : selectedProduct.backImage;
                                        const patchList = previewSide === 'front' ? frontPatches : backPatches;
                                        return (
                                            <div className="relative">
                                                <img src={imgSrc} alt={`${selectedProduct.name} ${previewSide}`} className="w-full object-contain" style={{ clipPath: s.clipPath, transform: s.transform }} />
                                                {patchList.map((patch) => {
                                                    const cz = patch.contentZone || { x: 0, y: 0, width: 100, height: 100 };
                                                    const cx = cz.x + cz.width / 2;
                                                    const cy = cz.y + cz.height / 2;
                                                    return (
                                                        <img key={patch.uniqueId} src={patch.image} alt={patch.name} className="absolute object-contain" style={{
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
                                </div>
                                <p className="text-center text-xs text-gray-400 mt-2">
                                    {previewSide === 'front' ? frontPatches.length : backPatches.length} patch{(previewSide === 'front' ? frontPatches.length : backPatches.length) !== 1 ? 'es' : ''} placed
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-sm text-gray-500">Total: <span className="font-bold text-text-dark">${totalPrice}</span></span>
                                <button onClick={() => setShowPreview(false)} className="btn-primary text-sm px-5 py-2">
                                    Back to Editing
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {showSuccess && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl p-8 text-center animate-bounce-in shadow-2xl">
                            <div className="w-20 h-20 bg-green rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-10 h-10 text-white" /></div>
                            <h3 className="font-heading text-2xl font-bold text-text-dark">Added to Cart!</h3>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
