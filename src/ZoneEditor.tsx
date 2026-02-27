import { useState, useRef, useEffect } from 'react';
import { MousePointer2, Check, X, BoxSelect, PenTool, Trash2, Sparkles } from 'lucide-react';

export interface Zone {
    x: number;
    y: number;
    width: number;
    height: number;
    points?: { x: number; y: number }[]; // Array of points for polygon, in %
    type: 'rectangle' | 'polygon';
}

interface ZoneEditorProps {
    image: string;
    initialZone?: Zone;
    title?: string;
    onSave: (zone: Zone) => void;
    onCancel: () => void;
}

export function ZoneEditor({ image, initialZone, title, onSave, onCancel }: ZoneEditorProps) {
    const [zoneType, setZoneType] = useState<'rectangle' | 'polygon'>(initialZone?.type || 'rectangle');
    // Rectangle state
    const [rectZone, setRectZone] = useState({
        x: initialZone?.x ?? 10,
        y: initialZone?.y ?? 10,
        width: initialZone?.width ?? 80,
        height: initialZone?.height ?? 80
    });
    // Polygon state
    const [polyPoints, setPolyPoints] = useState<{ x: number; y: number }[]>(initialZone?.points || []);

    const [isDragging, setIsDragging] = useState(false);
    const [dragTarget, setDragTarget] = useState<'rect-move' | 'rect-n' | 'rect-s' | 'rect-e' | 'rect-w' | 'rect-ne' | 'rect-nw' | 'rect-se' | 'rect-sw' | number | null>(null); // number is index of poly point

    const containerRef = useRef<HTMLDivElement>(null);
    const startPos = useRef({ x: 0, y: 0 });
    const startRect = useRef(rectZone);
    const startPoints = useRef(polyPoints);

    useEffect(() => {
        // Switch local state if initialZone changes or on mount
        if (initialZone) {
            setZoneType(initialZone.type);
            setRectZone({
                x: initialZone.x,
                y: initialZone.y,
                width: initialZone.width,
                height: initialZone.height
            });
            setPolyPoints(initialZone.points || []);
        }
    }, [initialZone]);

    const handleMouseDown = (e: React.MouseEvent, target: typeof dragTarget) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        setDragTarget(target);
        startPos.current = { x: e.clientX, y: e.clientY };
        startRect.current = rectZone;
        startPoints.current = polyPoints;
    };



    const handleContainerClick = (e: React.MouseEvent) => {
        if (zoneType !== 'polygon') return;
        if (isDragging) return; // Don't add point if we just dragged
        // Only add point if clicking pure container overlay, not existing points
        if ((e.target as HTMLElement).closest('.control-point')) return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setPolyPoints(prev => [...prev, { x, y }]);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const deltaX = ((e.clientX - startPos.current.x) / rect.width) * 100;
            const deltaY = ((e.clientY - startPos.current.y) / rect.height) * 100;

            if (zoneType === 'rectangle') {
                let newZone = { ...startRect.current };
                const mode = dragTarget as string; // safe cast for rect modes

                if (mode === 'rect-move') {
                    newZone.x = Math.max(0, Math.min(100 - newZone.width, startRect.current.x + deltaX));
                    newZone.y = Math.max(0, Math.min(100 - newZone.height, startRect.current.y + deltaY));
                } else {
                    if (mode?.includes('n')) {
                        const newY = Math.max(0, Math.min(startRect.current.y + startRect.current.height - 5, startRect.current.y + deltaY));
                        newZone.height = startRect.current.height + (startRect.current.y - newY);
                        newZone.y = newY;
                    }
                    if (mode?.includes('s')) {
                        newZone.height = Math.max(5, Math.min(100 - startRect.current.y, startRect.current.height + deltaY));
                    }
                    if (mode?.includes('w')) {
                        const newX = Math.max(0, Math.min(startRect.current.x + startRect.current.width - 5, startRect.current.x + deltaX));
                        newZone.width = startRect.current.width + (startRect.current.x - newX);
                        newZone.x = newX;
                    }
                    if (mode?.includes('e')) {
                        newZone.width = Math.max(5, Math.min(100 - startRect.current.x, startRect.current.width + deltaX));
                    }
                }
                setRectZone(newZone);
            } else {
                // Polygon Point Move
                if (typeof dragTarget === 'number') {
                    const idx = dragTarget;
                    const newPoints = [...startPoints.current];
                    if (newPoints[idx]) {
                        const p = newPoints[idx];
                        newPoints[idx] = {
                            x: Math.max(0, Math.min(100, p.x + deltaX)),
                            y: Math.max(0, Math.min(100, p.y + deltaY))
                        };
                        setPolyPoints(newPoints);
                    }
                }
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setDragTarget(null);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragTarget, zoneType]);

    // Auto-Trace Logic
    const handleAutoTrace = async () => {
        if (!image) return;

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = image;

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        // Simple threshold to find non-white/transparent pixels
        // We'll create a binary grid: 1 for object, 0 for background
        const grid: number[] = new Array(width * height).fill(0);

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // If not white and not transparent
            if (a > 20 && !(r > 240 && g > 240 && b > 240)) {
                grid[i / 4] = 1;
            }
        }

        // Marching Squares to find contour

        // Simplified Marching Squares or just boundary tracing
        // For simplicity/perf in this context, let's just find the convex hull or a simple boundary walk?
        // Let's do a simple specialized scan for this use case: distinct object on white.
        // We'll find the first pixel, then trace the edge.

        // Helper to check pixel
        const isSolid = (x: number, y: number) => {
            if (x < 0 || x >= width || y < 0 || y >= height) return false;
            return grid[y * width + x] === 1;
        };

        // Find separate contours (we only want the biggest one usually, or all?)
        // Let's just do a convex hull of all solid pixels for arguably the best "zone" experience 
        // effectively wrapping the object.
        // Actually, a tight fitting polygon is requested.

        // Let's collect edge points (pixels that are solid but have a non-solid neighbor)
        const edgePoints: { x: number; y: number }[] = [];
        const step = Math.max(1, Math.floor(Math.min(width, height) / 100)); // Optimization: skip pixels

        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                if (isSolid(x, y)) {
                    // Check neighbors
                    if (!isSolid(x - step, y) || !isSolid(x + step, y) || !isSolid(x, y - step) || !isSolid(x, y + step)) {
                        edgePoints.push({ x, y });
                    }
                }
            }
        }

        if (edgePoints.length < 3) return;

        // Convex Hull (Monotone Chain algorithm)
        edgePoints.sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);

        const cross = (o: { x: number, y: number }, a: { x: number, y: number }, b: { x: number, y: number }) => {
            return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
        };

        const lower: { x: number, y: number }[] = [];
        for (let point of edgePoints) {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
                lower.pop();
            }
            lower.push(point);
        }

        const upper: { x: number, y: number }[] = [];
        for (let point of edgePoints.reverse()) {
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
                upper.pop();
            }
            upper.push(point);
        }

        upper.pop();
        lower.pop();
        const hull = lower.concat(upper);

        // Convert to percentage
        const poly = hull.map(p => ({
            x: (p.x / width) * 100,
            y: (p.y / height) * 100
        }));

        setZoneType('polygon');
        setPolyPoints(poly);
    };

    const handleSave = () => {
        if (zoneType === 'rectangle') {
            onSave({ ...rectZone, type: 'rectangle' });
        } else {
            // Check if valid polygon (3+ points)
            if (polyPoints.length < 3) {
                alert("A polygon must have at least 3 points.");
                return;
            }
            // Calculate bounding box of polygon for fallback/initial positioning
            let minX = 100, maxX = 0, minY = 100, maxY = 0;
            polyPoints.forEach(p => {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            });

            onSave({
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY,
                points: polyPoints,
                type: 'polygon'
            });
        }
    };

    // Helper to generate SVG path from points logic
    const getPolygonPath = () => {
        if (polyPoints.length === 0) return '';
        return polyPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-4 w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-heading text-lg font-bold flex items-center gap-2">
                        <MousePointer2 className="w-5 h-5" /> {title || "Define Placement Zone"}
                    </h3>

                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setZoneType('rectangle')}
                            className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-semibold transition-all ${zoneType === 'rectangle' ? 'bg-white shadow-sm text-pink' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <BoxSelect className="w-4 h-4" /> Rectangle
                        </button>
                        <button
                            onClick={() => setZoneType('polygon')}
                            className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-semibold transition-all ${zoneType === 'polygon' ? 'bg-white shadow-sm text-pink' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <PenTool className="w-4 h-4" /> Polygon
                        </button>
                        <button
                            onClick={handleAutoTrace}
                            className="flex items-center gap-2 px-3 py-1 rounded-md text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-white transition-all ml-1"
                            title="Auto-detect clean edges"
                        >
                            <Sparkles className="w-4 h-4 text-purple-500" /> Auto Trace
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                            <X className="w-5 h-5" />
                        </button>
                        <button onClick={handleSave} className="btn-primary py-2 px-4 flex items-center gap-2">
                            <Check className="w-4 h-4" /> Save Zone
                        </button>
                    </div>
                </div>

                <div
                    className="flex-1 relative bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center select-none cursor-crosshair"
                    ref={containerRef}
                    onClick={handleContainerClick}
                >
                    <img src={image} alt="Reference" className="max-w-full max-h-[70vh] object-contain pointer-events-none" />

                    {/* Overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                        {zoneType === 'rectangle' && (
                            <div className="absolute inset-0 bg-black/30">
                                <div
                                    className="absolute bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-auto cursor-move border-2 border-green-400"
                                    style={{
                                        left: `${rectZone.x}%`,
                                        top: `${rectZone.y}%`,
                                        width: `${rectZone.width}%`,
                                        height: `${rectZone.height}%`
                                    }}
                                    onMouseDown={(e) => handleMouseDown(e, 'rect-move')}
                                >
                                    <div className="absolute -top-6 left-0 bg-green-500 text-white text-xs px-2 py-1 rounded pointer-events-none">
                                        RECT: {Math.round(rectZone.width)}% x {Math.round(rectZone.height)}%
                                    </div>
                                    {['nw', 'ne', 'sw', 'se'].map((h) => (
                                        <div
                                            key={h}
                                            className={`absolute w-3 h-3 bg-white border-2 border-green-500 rounded-full cursor-${h}-resize z-10`}
                                            style={{
                                                top: h.includes('n') ? '-6px' : 'auto',
                                                bottom: h.includes('s') ? '-6px' : 'auto',
                                                left: h.includes('w') ? '-6px' : 'auto',
                                                right: h.includes('e') ? '-6px' : 'auto',
                                            }}
                                            onMouseDown={(e) => handleMouseDown(e, `rect-${h}` as any)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {zoneType === 'polygon' && (
                            <div className="absolute inset-0">
                                {/* SVG for drawing the polygon lines and fill */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <defs>
                                        <mask id="poly-mask">
                                            <rect x="0" y="0" width="100" height="100" fill="white" />
                                            {polyPoints.length > 2 && (
                                                <path d={getPolygonPath()} fill="black" />
                                            )}
                                        </mask>
                                    </defs>
                                    <path
                                        d={`M0,0 L100,0 L100,100 L0,100 Z ${getPolygonPath()}`}
                                        fill="rgba(0,0,0,0.5)"
                                        fillRule="evenodd"
                                    />
                                    {polyPoints.length > 1 && (
                                        <path
                                            d={polyPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + (polyPoints.length > 2 ? ' Z' : '')}
                                            fill="none"
                                            stroke="#4ade80"
                                            strokeWidth="0.5"
                                            vectorEffect="non-scaling-stroke"
                                        />
                                    )}
                                </svg>

                                {/* Interactive Points */}
                                {polyPoints.map((p, i) => (
                                    <div
                                        key={i}
                                        className="control-point absolute w-3 h-3 bg-white border-2 border-green-500 rounded-full cursor-move pointer-events-auto hover:scale-125 transition-transform"
                                        style={{ left: `calc(${p.x}% - 6px)`, top: `calc(${p.y}% - 6px)` }}
                                        onMouseDown={(e) => handleMouseDown(e, i)}
                                        onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            // Remove point
                                            setPolyPoints(prev => prev.filter((_, idx) => idx !== i));
                                        }}
                                        title="Double click to delete"
                                    />
                                ))}

                                {polyPoints.length === 0 && (
                                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm pointer-events-none">
                                        Click to add points
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex justify-between items-center mt-2 px-2 text-sm text-gray-500">
                    <p>{zoneType === 'rectangle' ? 'Drag box to move, drag corners to resize.' : 'Click to add points, drag points to move, double-click a point to remove.'}</p>
                    {zoneType === 'polygon' && (
                        <button onClick={() => setPolyPoints([])} className="text-red-500 flex items-center gap-1 hover:underline text-xs"><Trash2 className="w-3 h-3" /> Clear Points</button>
                    )}
                </div>
            </div>
        </div>
    );
}
