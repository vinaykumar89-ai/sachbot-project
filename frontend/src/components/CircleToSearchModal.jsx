import React, { useRef, useState, useEffect } from 'react';
import { Crop, Check, X, RotateCcw, Crosshair, Sparkles, Image as ImageIcon, CircleDot } from 'lucide-react';

export default function CircleToSearchModal({
  isOpen,
  imageFile,
  imageUrl,
  onConfirmCrop,
  onSkipCrop,
  onCancel,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imageObj, setImageObj] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [selection, setSelection] = useState(null); // { x, y, width, height } in original image coordinates
  const [shapeMode, setShapeMode] = useState('rect'); // 'rect' | 'circle'
  const [cropPreviewUrl, setCropPreviewUrl] = useState(null);

  // Load the image onto memory
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      setImageObj(img);
      setSelection(null);
      setCropPreviewUrl(null);
    };
  }, [imageUrl]);

  // Render image and selection overlay on HTML5 Canvas
  useEffect(() => {
    if (!imageObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Scale canvas to fit container while preserving aspect ratio
    const containerWidth = containerRef.current ? containerRef.current.clientWidth : 600;
    const maxDisplayWidth = Math.min(containerWidth - 32, 700);
    const scale = maxDisplayWidth / imageObj.width;
    const displayWidth = maxDisplayWidth;
    const displayHeight = imageObj.height * scale;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Draw main image
    ctx.drawImage(imageObj, 0, 0, displayWidth, displayHeight);

    // If active drawing or existing selection, draw overlay
    const activeSel = selection
      ? {
          x: selection.x * scale,
          y: selection.y * scale,
          w: selection.width * scale,
          h: selection.height * scale,
        }
      : isDrawing
      ? {
          x: Math.min(startPos.x, currentPos.x),
          y: Math.min(startPos.y, currentPos.y),
          w: Math.abs(currentPos.x - startPos.x),
          h: Math.abs(currentPos.y - startPos.y),
        }
      : null;

    if (activeSel && activeSel.w > 5 && activeSel.h > 5) {
      // Darken outside
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // Clear the selected focus area
      ctx.beginPath();
      if (shapeMode === 'circle') {
        const cx = activeSel.x + activeSel.w / 2;
        const cy = activeSel.y + activeSel.h / 2;
        const rx = activeSel.w / 2;
        const ry = activeSel.h / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
      } else {
        ctx.rect(activeSel.x, activeSel.y, activeSel.w, activeSel.h);
      }
      ctx.clip();
      ctx.drawImage(imageObj, 0, 0, displayWidth, displayHeight);
      ctx.restore();

      // Draw glowing focus border
      ctx.save();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      if (shapeMode === 'circle') {
        const cx = activeSel.x + activeSel.w / 2;
        const cy = activeSel.y + activeSel.h / 2;
        const rx = activeSel.w / 2;
        const ry = activeSel.h / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
      } else {
        ctx.rect(activeSel.x, activeSel.y, activeSel.w, activeSel.h);
      }
      ctx.stroke();

      // Corner handles for rect
      if (shapeMode === 'rect') {
        const cornerSize = 8;
        ctx.fillStyle = '#10b981';
        ctx.fillRect(activeSel.x - 2, activeSel.y - 2, cornerSize, cornerSize);
        ctx.fillRect(activeSel.x + activeSel.w - 6, activeSel.y - 2, cornerSize, cornerSize);
        ctx.fillRect(activeSel.x - 2, activeSel.y + activeSel.h - 6, cornerSize, cornerSize);
        ctx.fillRect(activeSel.x + activeSel.w - 6, activeSel.y + activeSel.h - 6, cornerSize, cornerSize);
      }
      ctx.restore();
    }
  }, [imageObj, selection, isDrawing, currentPos, startPos, shapeMode]);

  // Handle Mouse/Touch Interaction
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(canvas.width, clientX - rect.left)),
      y: Math.max(0, Math.min(canvas.height, clientY - rect.top)),
    };
  };

  const handlePointerDown = (e) => {
    const coords = getCanvasCoords(e);
    setStartPos(coords);
    setCurrentPos(coords);
    setIsDrawing(true);
    setSelection(null);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);
    setCurrentPos(coords);
  };

  const handlePointerUp = () => {
    if (!isDrawing || !imageObj || !canvasRef.current) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    const scale = imageObj.width / canvas.width;

    const rawX = Math.min(startPos.x, currentPos.x);
    const rawY = Math.min(startPos.y, currentPos.y);
    const rawW = Math.abs(currentPos.x - startPos.x);
    const rawH = Math.abs(currentPos.y - startPos.y);

    if (rawW > 15 && rawH > 15) {
      const realX = Math.round(rawX * scale);
      const realY = Math.round(rawY * scale);
      const realW = Math.round(rawW * scale);
      const realH = Math.round(rawH * scale);

      setSelection({
        x: realX,
        y: realY,
        width: realW,
        height: realH,
      });

      // Generate instant preview blob
      generateCropBlob({ x: realX, y: realY, width: realW, height: realH }, (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCropPreviewUrl(url);
        }
      });
    }
  };

  const generateCropBlob = (sel, callback) => {
    if (!imageObj || !sel) {
      callback(null);
      return;
    }
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sel.width;
    tempCanvas.height = sel.height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.drawImage(
      imageObj,
      sel.x,
      sel.y,
      sel.width,
      sel.height,
      0,
      0,
      sel.width,
      sel.height
    );

    tempCanvas.toBlob((blob) => {
      callback(blob);
    }, 'image/jpeg', 0.95);
  };

  const handleConfirm = () => {
    if (selection) {
      generateCropBlob(selection, (blob) => {
        onConfirmCrop(blob, cropPreviewUrl);
      });
    } else {
      onSkipCrop();
    }
  };

  const handleReset = () => {
    setSelection(null);
    setCropPreviewUrl(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        ref={containerRef}
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Crosshair className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Circle-to-Search: Select Focus Region
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Targeted OCR
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Drag to draw a box or circle around the specific headline, tweet, chart, or face to investigate.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/80 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShapeMode('rect')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                shapeMode === 'rect'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Crop className="w-3.5 h-3.5" />
              Rectangle Box
            </button>
            <button
              onClick={() => setShapeMode('circle')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                shapeMode === 'circle'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <CircleDot className="w-3.5 h-3.5" />
              Circle Focus
            </button>
          </div>

          <div className="flex items-center gap-3">
            {selection && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Region
              </button>
            )}
            <span className="text-[11px] text-slate-500">
              {selection
                ? `Selected: ${selection.width} × ${selection.height} px`
                : 'Click & drag on image to highlight'}
            </span>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950 min-h-[320px]">
          <canvas
            ref={canvasRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            className="cursor-crosshair rounded-lg shadow-xl ring-1 ring-slate-800 select-none max-w-full"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onSkipCrop}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            <ImageIcon className="w-4 h-4 text-slate-400" />
            Verify Full Image (Skip Crop)
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Check className="w-4 h-4" />
              {selection ? 'Search Selected Focus Region' : 'Verify Full Image'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
