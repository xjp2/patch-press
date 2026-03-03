import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Check, Wand2, Square, Pentagon, Trash2 } from 'lucide-react';

export interface TracedZone {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'rectangle' | 'polygon';
  points?: { x: number; y: number }[];
}

interface ImageTracerProps {
  imageUrl: string;
  initialZone?: TracedZone;
  onSave: (zone: TracedZone) => void;
  onCancel: () => void;
  title?: string;
  mode?: 'placement' | 'crop' | 'patch';
}

type ToolMode = 'rectangle' | 'polygon' | 'auto';

export function ImageTracer({ 
  imageUrl, 
  initialZone, 
  onSave, 
  onCancel,
  title: customTitle,
  mode = 'placement'
}: ImageTracerProps) {
  const title = customTitle || (mode === 'patch' ? 'Define Patch Bounds (Trim)' : 'Define Placement Zone');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string>(imageUrl);
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  
  // Zone state
  const [zone, setZone] = useState<TracedZone>(() => {
    if (initialZone) {
      return { ...initialZone };
    }
    return { x: 25, y: 25, width: 50, height: 50, type: 'rectangle', points: [] };
  });
  
  const [activeTool, setActiveTool] = useState<ToolMode>('rectangle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Polygon drawing state
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>(
    initialZone?.type === 'polygon' && initialZone.points ? initialZone.points : []
  );
  
  // Drag state for polygon nodes
  const [draggingNodeIndex, setDraggingNodeIndex] = useState<number | null>(null);
  
  // Rectangle drag/resize state
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<string>('');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, zoneX: 0, zoneY: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });

  // Fetch image with proper CORS handling
  useEffect(() => {
    const fetchImage = async () => {
      try {
        const response = await fetch(imageUrl, { mode: 'cors' });
        if (response.ok) {
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          setProcessedImageUrl(objectUrl);
        } else {
          setProcessedImageUrl(imageUrl);
        }
      } catch (err) {
        setProcessedImageUrl(imageUrl);
      }
    };
    
    fetchImage();
    
    return () => {
      if (processedImageUrl !== imageUrl && processedImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(processedImageUrl);
      }
    };
  }, [imageUrl]);

  // Get mouse position as percentage of image
  const getMousePos = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!imageRef.current) return { x: 0, y: 0 };
    const rect = imageRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
  }, []);

  // Auto-trace: Find product contour and create polygon
  const autoTrace = useCallback(async () => {
    if (!imageRef.current || !imageNaturalSize.width) {
      setError('Image not loaded yet');
      return;
    }

    setIsProcessing(true);
    setError('');
    setActiveTool('auto');

    try {
      const img = imageRef.current;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas context');

      // Scale down for performance
      const maxSize = 400;
      const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      
      try {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.getImageData(0, 0, 1, 1);
      } catch (e) {
        throw new Error('Cannot read image data due to cross-origin restrictions. Please draw the zone manually or use a local image.');
      }
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      const threshold = 240;
      const width = canvas.width;
      const height = canvas.height;
      
      // Helper to check if pixel is content (not white/transparent)
      const isContent = (x: number, y: number) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return false;
        const i = (y * width + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        const brightness = (r + g + b) / 3;
        return brightness < threshold && a > 50;
      };
      
      // Find content bounds
      let minX = width, minY = height, maxX = 0, maxY = 0;
      let hasContent = false;
      
      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          if (isContent(x, y)) {
            hasContent = true;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      if (!hasContent) {
        setError('No content detected - image may be all white');
        setActiveTool('rectangle');
        setIsProcessing(false);
        return;
      }

      // Sample points around the contour
      const contourPoints: { x: number; y: number }[] = [];
      const padding = 3;
      
      // Scan from each side to find edges and create a polygon outline
      // Top edge - scan left to right, find topmost content at each x
      const topPoints: { x: number; y: number }[] = [];
      for (let x = minX; x <= maxX; x += Math.max(2, Math.floor((maxX - minX) / 20))) {
        for (let y = minY; y <= maxY && y < minY + (maxY - minY) * 0.5; y++) {
          if (isContent(x, y)) {
            topPoints.push({ x, y: Math.max(0, y - padding) });
            break;
          }
        }
      }
      
      // Right edge - scan top to bottom, find rightmost content at each y
      const rightPoints: { x: number; y: number }[] = [];
      for (let y = minY; y <= maxY; y += Math.max(2, Math.floor((maxY - minY) / 15))) {
        for (let x = maxX; x >= minX && x > minX + (maxX - minX) * 0.5; x--) {
          if (isContent(x, y)) {
            rightPoints.push({ x: Math.min(width, x + padding), y });
            break;
          }
        }
      }
      
      // Bottom edge - scan right to left, find bottommost content at each x
      const bottomPoints: { x: number; y: number }[] = [];
      for (let x = maxX; x >= minX; x -= Math.max(2, Math.floor((maxX - minX) / 20))) {
        for (let y = maxY; y >= minY && y > minY + (maxY - minY) * 0.5; y--) {
          if (isContent(x, y)) {
            bottomPoints.push({ x, y: Math.min(height, y + padding) });
            break;
          }
        }
      }
      
      // Left edge - scan bottom to top, find leftmost content at each y
      const leftPoints: { x: number; y: number }[] = [];
      for (let y = maxY; y >= minY; y -= Math.max(2, Math.floor((maxY - minY) / 15))) {
        for (let x = minX; x <= maxX && x < minX + (maxX - minX) * 0.5; x++) {
          if (isContent(x, y)) {
            leftPoints.push({ x: Math.max(0, x - padding), y });
            break;
          }
        }
      }
      
      // Combine points in clockwise order
      contourPoints.push(...topPoints);
      contourPoints.push(...rightPoints);
      contourPoints.push(...bottomPoints);
      contourPoints.push(...leftPoints);
      
      // Remove duplicate points
      const uniquePoints = contourPoints.filter((p, i, arr) => {
        const prev = arr[(i - 1 + arr.length) % arr.length];
        const dist = Math.sqrt(Math.pow(p.x - prev.x, 2) + Math.pow(p.y - prev.y, 2));
        return dist > 2; // Filter out very close points
      });
      
      if (uniquePoints.length < 4) {
        // Fallback to rectangle if not enough contour points
        const newZone: TracedZone = {
          x: (minX / width) * 100,
          y: (minY / height) * 100,
          width: ((maxX - minX) / width) * 100,
          height: ((maxY - minY) / height) * 100,
          type: 'rectangle',
          points: []
        };
        setZone(newZone);
        setPolygonPoints([]);
        setActiveTool('rectangle');
      } else {
        // Convert to percentages and create polygon
        const polygonPointsPct = uniquePoints.map(p => ({
          x: (p.x / width) * 100,
          y: (p.y / height) * 100
        }));
        
        // Calculate bounding box
        const xs = polygonPointsPct.map(p => p.x);
        const ys = polygonPointsPct.map(p => p.y);
        
        const newZone: TracedZone = {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
          type: 'polygon',
          points: polygonPointsPct
        };
        
        setZone(newZone);
        setPolygonPoints(polygonPointsPct);
        setActiveTool('polygon');
      }
    } catch (err) {
      console.error('Auto-trace error:', err);
      setError('Auto-trace failed: ' + (err as Error).message);
      setActiveTool('rectangle');
    } finally {
      setIsProcessing(false);
    }
  }, [imageNaturalSize]);

  // Mouse handlers for rectangle
  const handleMouseDown = (e: React.MouseEvent, corner?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (activeTool === 'polygon') return;
    
    const pos = getMousePos(e);
    const clampedPos = { x: Math.max(0, Math.min(100, pos.x)), y: Math.max(0, Math.min(100, pos.y)) };
    
    if (corner && zone.type === 'rectangle') {
      setIsResizing(true);
      setResizeCorner(corner);
      setDragStart({ x: clampedPos.x, y: clampedPos.y, zoneX: zone.x, zoneY: zone.y });
    } else if (zone.type === 'rectangle' && zone.width > 0) {
      const inside = clampedPos.x >= zone.x && clampedPos.x <= zone.x + zone.width &&
                     clampedPos.y >= zone.y && clampedPos.y <= zone.y + zone.height;
      
      if (inside) {
        setIsDragging(true);
        setDragStart({ x: clampedPos.x, y: clampedPos.y, zoneX: zone.x, zoneY: zone.y });
      } else {
        setIsDrawing(true);
        setDrawStart(clampedPos);
        setZone({ x: clampedPos.x, y: clampedPos.y, width: 0, height: 0, type: 'rectangle', points: [] });
      }
    } else {
      setIsDrawing(true);
      setDrawStart(clampedPos);
      setZone({ x: clampedPos.x, y: clampedPos.y, width: 0, height: 0, type: 'rectangle', points: [] });
    }
  };

  // Handle polygon node drag start
  const handleNodeMouseDown = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingNodeIndex(index);
  };

  // Handle polygon node double-click to delete
  const handleNodeDoubleClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent deletion if it would leave fewer than 3 points
    if (polygonPoints.length <= 3) {
      setError('A polygon needs at least 3 points');
      setTimeout(() => setError(''), 2000);
      return;
    }
    
    const newPoints = polygonPoints.filter((_, i) => i !== index);
    setPolygonPoints(newPoints);
    
    // Update zone if it's a polygon
    if (zone.type === 'polygon') {
      const xs = newPoints.map(p => p.x);
      const ys = newPoints.map(p => p.y);
      setZone(prev => ({
        ...prev,
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
        points: newPoints
      }));
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Handle polygon node dragging
    if (draggingNodeIndex !== null) {
      const pos = getMousePos(e);
      const clampedPos = { 
        x: Math.max(0, Math.min(100, pos.x)), 
        y: Math.max(0, Math.min(100, pos.y)) 
      };
      
      setPolygonPoints(prev => {
        const newPoints = [...prev];
        newPoints[draggingNodeIndex] = clampedPos;
        return newPoints;
      });
      
      // Also update the zone if it's a polygon
      if (zone.type === 'polygon') {
        setZone(prev => ({
          ...prev,
          points: polygonPoints.map((p, i) => i === draggingNodeIndex ? clampedPos : p)
        }));
      }
      return;
    }
    
    if (!isDragging && !isResizing && !isDrawing) return;
    
    const pos = getMousePos(e);
    const clampedPos = { x: Math.max(0, Math.min(100, pos.x)), y: Math.max(0, Math.min(100, pos.y)) };
    
    if (isDrawing) {
      const newX = Math.min(drawStart.x, clampedPos.x);
      const newY = Math.min(drawStart.y, clampedPos.y);
      setZone({
        ...zone,
        x: newX,
        y: newY,
        width: Math.abs(clampedPos.x - drawStart.x),
        height: Math.abs(clampedPos.y - drawStart.y)
      });
    } else if (isDragging) {
      const dx = clampedPos.x - dragStart.x;
      const dy = clampedPos.y - dragStart.y;
      setZone({
        ...zone,
        x: Math.max(0, Math.min(100 - zone.width, dragStart.zoneX + dx)),
        y: Math.max(0, Math.min(100 - zone.height, dragStart.zoneY + dy))
      });
    } else if (isResizing) {
      const minSize = 5;
      setZone(prev => {
        let newZone = { ...prev };
        switch (resizeCorner) {
          case 'nw':
            newZone.x = Math.min(prev.x + prev.width - minSize, Math.max(0, clampedPos.x));
            newZone.y = Math.min(prev.y + prev.height - minSize, Math.max(0, clampedPos.y));
            newZone.width = prev.x + prev.width - newZone.x;
            newZone.height = prev.y + prev.height - newZone.y;
            break;
          case 'ne':
            newZone.y = Math.min(prev.y + prev.height - minSize, Math.max(0, clampedPos.y));
            newZone.width = Math.max(minSize, Math.min(100 - prev.x, clampedPos.x - prev.x));
            newZone.height = prev.y + prev.height - newZone.y;
            break;
          case 'sw':
            newZone.x = Math.min(prev.x + prev.width - minSize, Math.max(0, clampedPos.x));
            newZone.width = prev.x + prev.width - newZone.x;
            newZone.height = Math.max(minSize, Math.min(100 - prev.y, clampedPos.y - prev.y));
            break;
          case 'se':
            newZone.width = Math.max(minSize, Math.min(100 - prev.x, clampedPos.x - prev.x));
            newZone.height = Math.max(minSize, Math.min(100 - prev.y, clampedPos.y - prev.y));
            break;
        }
        return newZone;
      });
    }
  }, [isDragging, isResizing, isDrawing, dragStart, drawStart, getMousePos, zone, draggingNodeIndex, polygonPoints]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setIsDrawing(false);
    setDraggingNodeIndex(null);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing || isDrawing || draggingNodeIndex !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, isDrawing, draggingNodeIndex, handleMouseMove, handleMouseUp]);

  // Polygon handlers
  const handlePolygonClick = (e: React.MouseEvent) => {
    if (activeTool !== 'polygon') return;
    if (draggingNodeIndex !== null) return; // Don't add point if we were dragging
    
    const pos = getMousePos(e);
    const clampedPos = { x: Math.max(0, Math.min(100, pos.x)), y: Math.max(0, Math.min(100, pos.y)) };
    
    // Check if clicking near first point to close
    if (polygonPoints.length >= 3) {
      const firstPoint = polygonPoints[0];
      const dist = Math.sqrt(
        Math.pow(clampedPos.x - firstPoint.x, 2) + 
        Math.pow(clampedPos.y - firstPoint.y, 2)
      );
      if (dist < 5) {
        closePolygon();
        return;
      }
    }
    
    setPolygonPoints([...polygonPoints, clampedPos]);
  };

  const closePolygon = () => {
    if (polygonPoints.length >= 3) {
      const xs = polygonPoints.map(p => p.x);
      const ys = polygonPoints.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      
      setZone({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        type: 'polygon',
        points: [...polygonPoints]
      });
    }
  };

  const handleSave = () => {
    if (activeTool === 'polygon' && polygonPoints.length >= 3) {
      closePolygon();
      setTimeout(() => onSave(zone), 50);
    } else if (activeTool === 'polygon') {
      closePolygon();
      setTimeout(() => onSave({
        ...zone,
        x: Math.min(...polygonPoints.map(p => p.x)),
        y: Math.min(...polygonPoints.map(p => p.y)),
        width: Math.max(...polygonPoints.map(p => p.x)) - Math.min(...polygonPoints.map(p => p.x)),
        height: Math.max(...polygonPoints.map(p => p.y)) - Math.min(...polygonPoints.map(p => p.y)),
        type: 'polygon',
        points: polygonPoints
      }), 50);
    } else {
      onSave(zone);
    }
  };

  const handleClear = () => {
    setZone({ x: 25, y: 25, width: 50, height: 50, type: 'rectangle', points: [] });
    setPolygonPoints([]);
    setActiveTool('rectangle');
    setError('');
  };

  const buildPointsString = (points: { x: number; y: number }[]) => {
    if (!points.length) return '';
    return points.map(p => `${p.x},${p.y}`).join(' ');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-4">
            <div className="text-2xl">◤</div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Tool Tabs - Context7 Best Practice: focus-visible for accessibility */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 mr-4 gap-1" role="tablist" aria-label="Tracing tools">
              <button
                role="tab"
                aria-selected={activeTool === 'rectangle'}
                onClick={() => {
                  setActiveTool('rectangle');
                  setPolygonPoints([]);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 ${
                  activeTool === 'rectangle' 
                    ? 'bg-white text-pink shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Square className="w-4 h-4" aria-hidden="true" />
                Rectangle
              </button>
              <button
                role="tab"
                aria-selected={activeTool === 'polygon'}
                onClick={() => {
                  setActiveTool('polygon');
                  setPolygonPoints([]);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 ${
                  activeTool === 'polygon' 
                    ? 'bg-white text-pink shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Pentagon className="w-4 h-4" aria-hidden="true" />
                Polygon
              </button>
              <button
                role="tab"
                aria-selected={activeTool === 'auto'}
                onClick={autoTrace}
                disabled={isProcessing || !imageLoaded}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 ${
                  activeTool === 'auto' || isProcessing
                    ? 'bg-white text-pink shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                } ${(!imageLoaded) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-pink border-t-transparent rounded-full animate-spin" role="status" aria-label="Processing" />
                ) : (
                  <Wand2 className="w-4 h-4" aria-hidden="true" />
                )}
                Auto Trace
              </button>
            </div>
            
            <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-5 py-2 bg-red-50 border-b border-red-100">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Polygon Instructions */}
        {activeTool === 'polygon' && (
          <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
            <p className="text-sm text-blue-600">
              Click to add • Drag to move • <span className="font-semibold">Double-click to delete</span> • Click first point to close • ({polygonPoints.length} pts)
            </p>
            {polygonPoints.length > 0 && (
              <button
                onClick={() => setPolygonPoints([])}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        )}

        {/* Image Area */}
        <div 
          className="flex-1 overflow-auto bg-gray-50 relative flex items-center justify-center p-8"
          ref={containerRef}
        >
          <div className="relative inline-block">
            <img
              ref={imageRef}
              src={processedImageUrl}
              alt="Product"
              crossOrigin="anonymous"
              className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
              onLoad={() => {
                if (imageRef.current) {
                  setImageNaturalSize({
                    width: imageRef.current.naturalWidth,
                    height: imageRef.current.naturalHeight
                  });
                  setImageLoaded(true);
                }
              }}
              onError={() => {
                if (processedImageUrl !== imageUrl) {
                  setProcessedImageUrl(imageUrl);
                }
              }}
            />

            {/* Overlay Container */}
            <div 
              className="absolute inset-0 rounded-lg overflow-hidden"
              onClick={handlePolygonClick}
              style={{ cursor: activeTool === 'polygon' ? 'crosshair' : 'default' }}
            >
              {/* Rectangle dark overlay */}
              {activeTool === 'rectangle' && zone.type === 'rectangle' && zone.width > 0 && (
                <>
                  <div className="absolute bg-black/50" style={{ top: 0, left: 0, right: 0, height: `${zone.y}%` }} />
                  <div className="absolute bg-black/50" style={{ bottom: 0, left: 0, right: 0, height: `${Math.max(0, 100 - zone.y - zone.height)}%` }} />
                  <div className="absolute bg-black/50" style={{ top: `${zone.y}%`, left: 0, width: `${zone.x}%`, height: `${zone.height}%` }} />
                  <div className="absolute bg-black/50" style={{ top: `${zone.y}%`, right: 0, width: `${Math.max(0, 100 - zone.x - zone.width)}%`, height: `${zone.height}%` }} />
                </>
              )}

              {/* Polygon Overlay */}
              {activeTool === 'polygon' && polygonPoints.length > 0 && (
                <svg 
                  className="absolute inset-0 w-full h-full" 
                  viewBox="0 0 100 100" 
                  preserveAspectRatio="none"
                  style={{ pointerEvents: 'none' }}
                >
                  <defs>
                    <mask id="polygonHole">
                      <rect x="0" y="0" width="100" height="100" fill="white" />
                      <polygon 
                        points={buildPointsString(polygonPoints)} 
                        fill="black"
                      />
                    </mask>
                  </defs>
                  
                  <rect 
                    x="0" y="0" width="100" height="100" 
                    fill="rgba(0,0,0,0.5)" 
                    mask="url(#polygonHole)"
                  />
                  
                  <polygon 
                    points={buildPointsString(polygonPoints)}
                    fill="rgba(236, 72, 153, 0.2)"
                    stroke="rgb(236, 72, 153)"
                    strokeWidth="0.5"
                  />
                  
                  {polygonPoints.map((p, i) => {
                    if (i === 0) return null;
                    const prev = polygonPoints[i - 1];
                    return (
                      <line 
                        key={`line-${i}`}
                        x1={prev.x} 
                        y1={prev.y}
                        x2={p.x} 
                        y2={p.y}
                        stroke="rgb(236, 72, 153)"
                        strokeWidth="0.5"
                      />
                    );
                  })}
                  
                  {polygonPoints.length >= 3 && (
                    <line 
                      x1={polygonPoints[polygonPoints.length - 1].x}
                      y1={polygonPoints[polygonPoints.length - 1].y}
                      x2={polygonPoints[0].x}
                      y2={polygonPoints[0].y}
                      stroke="rgb(236, 72, 153)"
                      strokeWidth="0.3"
                      strokeDasharray="2,2"
                    />
                  )}
                </svg>
              )}

              {/* Show saved polygon zone when in rectangle mode */}
              {activeTool === 'rectangle' && zone.type === 'polygon' && zone.points && zone.points.length > 0 && (
                <svg 
                  className="absolute inset-0 w-full h-full" 
                  viewBox="0 0 100 100" 
                  preserveAspectRatio="none"
                  style={{ pointerEvents: 'none' }}
                >
                  <defs>
                    <mask id="existingPolygonHole">
                      <rect x="0" y="0" width="100" height="100" fill="white" />
                      <polygon 
                        points={buildPointsString(zone.points)} 
                        fill="black"
                      />
                    </mask>
                  </defs>
                  
                  <rect 
                    x="0" y="0" width="100" height="100" 
                    fill="rgba(0,0,0,0.5)" 
                    mask="url(#existingPolygonHole)"
                  />
                  
                  <polygon 
                    points={buildPointsString(zone.points)}
                    fill="rgba(236, 72, 153, 0.2)"
                    stroke="rgb(236, 72, 153)"
                    strokeWidth="0.5"
                  />
                </svg>
              )}

              {/* Rectangle zone controls */}
              {activeTool === 'rectangle' && zone.type === 'rectangle' && zone.width > 0 && (
                <div
                  className="absolute border-2 border-white shadow-[0_0_0_2px_rgba(236,72,153,0.8)] cursor-move"
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`
                  }}
                  onMouseDown={(e) => handleMouseDown(e)}
                >
                  <div className="absolute -top-6 left-0 bg-pink text-white text-xs px-2 py-0.5 rounded font-medium">
                    {Math.round(zone.width)}% x {Math.round(zone.height)}%
                  </div>
                  
                  <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-white border-2 border-pink rounded-full cursor-nw-resize shadow-md"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'nw'); }} />
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-pink rounded-full cursor-ne-resize shadow-md"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'ne'); }} />
                  <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-white border-2 border-pink rounded-full cursor-sw-resize shadow-md"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'sw'); }} />
                  <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-pink rounded-full cursor-se-resize shadow-md"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'se'); }} />
                </div>
              )}

              {/* Polygon point markers - draggable */}
              {activeTool === 'polygon' && polygonPoints.map((point, i) => (
                <div
                  key={i}
                  className="absolute w-4 h-4 bg-pink border-2 border-white rounded-full shadow-md -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform z-10 group"
                  style={{ 
                    left: `${point.x}%`, 
                    top: `${point.y}%`,
                    cursor: draggingNodeIndex === i ? 'grabbing' : 'grab'
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(e, i)}
                  onDoubleClick={(e) => handleNodeDoubleClick(e, i)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (i === 0 && polygonPoints.length >= 3) {
                      closePolygon();
                    }
                  }}
                  title="Drag to move, double-click to delete"
                >
                  {i === 0 && polygonPoints.length >= 3 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-pink font-medium whitespace-nowrap bg-white px-1 rounded shadow">
                      Click to close
                    </div>
                  )}
                  {/* Delete indicator on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] text-white font-bold group-hover:opacity-0 transition-opacity">
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t bg-white rounded-b-2xl">
          <p className="text-sm text-gray-500">
            {activeTool === 'polygon' 
              ? 'Click to add • Drag to move • Double-click to delete • Click first point to close' 
              : 'Drag box to move, drag corners to resize. Click outside to draw new.'}
          </p>
          
          {/* Context7 Best Practice: Consistent button spacing with gap-3 */}
          <div className="flex items-center gap-3">
            {activeTool === 'polygon' && polygonPoints.length >= 3 && (
              <button
                onClick={closePolygon}
                className="px-4 py-2 bg-pink text-white rounded-xl text-sm font-medium hover:bg-pink/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2"
              >
                Close Polygon
              </button>
            )}
            <button
              onClick={handleClear}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
            {/* Context7 Best Practice: Primary action with proper focus ring */}
            <button
              onClick={handleSave}
              disabled={activeTool === 'rectangle' ? (zone.width === 0 || zone.height === 0) : polygonPoints.length < 3}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#4a7c59] hover:bg-[#3d6b4a] text-white rounded-full font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a7c59] focus-visible:ring-offset-2 transition-all"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              Save Zone
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
