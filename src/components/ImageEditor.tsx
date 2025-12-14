"use client";

import React, { useState, useRef, useEffect } from "react";
import Cropper from "react-easy-crop";
import { Area } from "react-easy-crop/types";
import { 
  X, 
  Crop as CropIcon, 
  Pen, 
  Type, 
  Monitor, 
  RotateCw, 
  Send, 
  Undo2, 
  Image as ImageIcon,
  Clock,
  Check,
  Smartphone,
  Square,
  RectangleHorizontal,
  RectangleVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import getCroppedImg from "@/utils/canvasUtils";
import { cn } from "@/lib/utils";
import { showSuccess } from "@/utils/toast";

interface ImageEditorProps {
  file: File;
  recipientName: string;
  onClose: () => void;
  onSend: (blob: Blob, caption: string) => void;
}

const COLORS = [
  "#ff0000", // Red
  "#ff4500", // Orange
  "#ffff00", // Yellow
  "#00ff00", // Green
  "#00ffff", // Cyan
  "#0000ff", // Blue
  "#ff00ff", // Magenta
  "#ffffff", // White
  "#000000", // Black
];

const ASPECT_RATIOS = [
  { label: "Free", value: undefined, icon: Monitor },
  { label: "Original", value: "original", icon: ImageIcon },
  { label: "1:1", value: 1, icon: Square },
  { label: "4:3", value: 4/3, icon: RectangleHorizontal },
  { label: "3:4", value: 3/4, icon: RectangleVertical },
  { label: "16:9", value: 16/9, icon: Monitor },
];

const ImageEditor: React.FC<ImageEditorProps> = ({ file, recipientName, onClose, onSend }) => {
  // Global State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'crop' | 'draw'>('view');
  const [isHD, setIsHD] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [caption, setCaption] = useState("");

  // Crop State
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined);
  // We need to know original aspect for "Original" setting
  const [originalAspect, setOriginalAspect] = useState<number>(1);

  // Drawing State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState("#ff0000");
  const [drawingHistory, setDrawingHistory] = useState<ImageData[]>([]);
  
  // Initialize Image
  useEffect(() => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = reader.result?.toString() || "";
      setImageSrc(result);
      
      // Determine original aspect ratio
      const img = new Image();
      img.src = result;
      img.onload = () => {
        setOriginalAspect(img.width / img.height);
      };
    });
    reader.readAsDataURL(file);
  }, [file]);

  // --- Drawing Logic ---
  
  const initCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !imageSrc) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const aspect = img.width / img.height;
      let renderWidth = container.clientWidth;
      let renderHeight = container.clientHeight;

      if (renderWidth / renderHeight > aspect) {
        renderWidth = renderHeight * aspect;
      } else {
        renderHeight = renderWidth / aspect;
      }

      canvas.width = renderWidth;
      canvas.height = renderHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 5;
      }
    };
  };

  useEffect(() => {
    if (mode === 'draw' || mode === 'view') {
      setTimeout(initCanvas, 100);
    }
  }, [mode, imageSrc]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      setDrawingHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    }

    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.beginPath();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || mode !== 'draw') return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.strokeStyle = drawColor;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const undoDraw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || drawingHistory.length === 0) return;

    const lastState = drawingHistory[drawingHistory.length - 1];
    ctx.putImageData(lastState, 0, 0);
    setDrawingHistory(prev => prev.slice(0, -1));
  };


  // --- Crop Logic ---

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const applyCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      const newUrl = URL.createObjectURL(croppedBlob);
      setImageSrc(newUrl);
      setRotation(0);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setDrawingHistory([]);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      setMode('view');
    } catch (e) {
      console.error(e);
    }
  };

  const handleAspectChange = (value: number | "original" | undefined) => {
    if (value === "original") {
      setAspectRatio(originalAspect);
    } else {
      setAspectRatio(value);
    }
  };

  // --- Send Logic ---

  const handleSend = async () => {
    if (!imageSrc) return;
    setIsProcessing(true);
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = imageSrc;
      });

      canvas.width = img.width;
      canvas.height = img.height;
      
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const displayCanvas = canvasRef.current;
        if (displayCanvas) {
           ctx.drawImage(displayCanvas, 0, 0, displayCanvas.width, displayCanvas.height, 0, 0, canvas.width, canvas.height);
        }

        canvas.toBlob((blob) => {
          if (blob) {
            onSend(blob, caption);
          }
        }, 'image/jpeg', isHD ? 0.95 : 0.7);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };


  if (!imageSrc) return null;

  return (
    // Increased z-index to z-[100] to overlay the bottom nav (which is z-50)
    <div className="fixed inset-0 z-[100] bg-black flex flex-col font-sans select-none">
      
      {/* --- Top Bar --- */}
      <div className="flex justify-between items-center p-3 z-20 bg-gradient-to-b from-black/60 to-transparent absolute top-0 w-full">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 rounded-full h-10 w-10">
          <X className="h-6 w-6" />
        </Button>
        
        {mode !== 'crop' && (
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsHD(!isHD)} 
              className={cn("text-white hover:bg-white/10 rounded-full h-10 w-10", isHD && "text-blue-400")}
            >
              <div className="flex flex-col items-center justify-center leading-none">
                <span className="font-bold text-xs border border-current rounded px-0.5">HD</span>
                {isHD && <Check className="h-2 w-2 absolute bottom-2 right-2 bg-blue-500 rounded-full text-white p-0.5" />}
              </div>
            </Button>

            <Button variant="ghost" size="icon" onClick={() => setMode('crop')} className="text-white hover:bg-white/10 rounded-full h-10 w-10">
              <CropIcon className="h-6 w-6" />
            </Button>
            
            <Button variant="ghost" size="icon" onClick={() => showSuccess("Text tool coming soon!")} className="text-white hover:bg-white/10 rounded-full h-10 w-10">
              <Type className="h-6 w-6" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setMode(mode === 'draw' ? 'view' : 'draw')} 
              className={cn("text-white hover:bg-white/10 rounded-full h-10 w-10", mode === 'draw' && "bg-white/20")}
            >
              <Pen className="h-6 w-6" />
            </Button>
          </div>
        )}
      </div>

      {/* --- Main Area --- */}
      <div className="flex-1 relative w-full h-full overflow-hidden bg-zinc-900 flex items-center justify-center" ref={containerRef}>
        
        {mode === 'crop' ? (
          <div className="absolute inset-0 top-16 bottom-32 bg-black">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              classes={{
                containerClassName: "bg-black",
              }}
            />
          </div>
        ) : (
          <div className="relative max-w-full max-h-full">
            <img 
              src={imageSrc} 
              alt="Edit" 
              className="max-w-full max-h-[80vh] object-contain block mx-auto" 
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full touch-none cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              style={{ pointerEvents: mode === 'draw' ? 'auto' : 'none' }}
            />
          </div>
        )}

        {/* --- Color Picker (Draw Mode) --- */}
        {mode === 'draw' && (
          <div className="absolute top-20 right-4 flex flex-col gap-2 z-20 bg-black/30 p-2 rounded-full backdrop-blur-sm">
             {COLORS.map(color => (
               <button
                 key={color}
                 className={cn(
                   "w-6 h-6 rounded-full border-2 border-white/20 transition-transform hover:scale-110",
                   drawColor === color && "scale-125 border-white"
                 )}
                 style={{ backgroundColor: color }}
                 onClick={() => setDrawColor(color)}
               />
             ))}
             <div className="h-px bg-white/20 my-1" />
             <button onClick={undoDraw} className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-white">
               <Undo2 className="h-4 w-4" />
             </button>
          </div>
        )}

      </div>

      {/* --- Bottom Bar --- */}
      {mode === 'crop' ? (
        <div className="bg-black text-white z-20 w-full flex flex-col pb-safe">
            {/* Aspect Ratio Toolbar */}
            <div className="flex gap-4 overflow-x-auto p-2 no-scrollbar justify-center border-b border-white/10">
              {ASPECT_RATIOS.map((ratio) => {
                const isActive = ratio.value === "original" 
                  ? aspectRatio === originalAspect 
                  : aspectRatio === ratio.value;
                return (
                  <button
                    key={ratio.label}
                    onClick={() => handleAspectChange(ratio.value as any)}
                    className={cn(
                      "flex flex-col items-center gap-1 min-w-[50px] p-1 rounded transition-colors",
                      isActive ? "text-blue-400" : "text-gray-400 hover:text-white"
                    )}
                  >
                    <ratio.icon className="h-5 w-5" />
                    <span className="text-[10px] uppercase">{ratio.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center p-4">
              <Button variant="ghost" onClick={() => setMode('view')} className="text-white hover:bg-white/10">Cancel</Button>
              <div className="flex gap-4">
                 <Button variant="ghost" size="icon" onClick={() => setRotation(r => r - 90)} className="hover:bg-white/10"><RotateCw className="h-5 w-5 -scale-x-100" /></Button>
                 <Button variant="ghost" size="icon" onClick={() => { setRotation(0); setZoom(1); setCrop({x:0, y:0}); }} className="text-xs hover:bg-white/10">Reset</Button>
                 <Button variant="ghost" size="icon" onClick={() => setRotation(r => r + 90)} className="hover:bg-white/10"><RotateCw className="h-5 w-5" /></Button>
              </div>
              <Button onClick={applyCrop} className="text-blue-400 hover:text-blue-300 font-bold hover:bg-white/10" variant="ghost">Done</Button>
            </div>
        </div>
      ) : (
        <div className="bg-black/80 backdrop-blur-md p-3 pb-safe z-20 w-full">
           <div className="max-w-3xl mx-auto flex items-end gap-2">
              <div className="flex-1 bg-zinc-800/80 rounded-[24px] px-2 py-1.5 flex flex-col min-h-[44px]">
                 <div className="flex items-center gap-2 px-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 rounded-full shrink-0 hover:bg-zinc-700/50">
                       <ImageIcon className="h-5 w-5" />
                    </Button>
                    <Input
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Add a caption..."
                      className="bg-transparent border-none text-white placeholder:text-zinc-400 focus-visible:ring-0 p-0 h-8 text-base shadow-none"
                      autoFocus
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 rounded-full shrink-0 hover:bg-zinc-700/50">
                       <Clock className="h-5 w-5" />
                    </Button>
                 </div>
                 {recipientName && (
                   <div className="px-3 pb-1 text-[11px] text-zinc-400 font-medium truncate flex items-center justify-between">
                     <span>{recipientName}</span>
                   </div>
                 )}
              </div>
              
              <Button 
                onClick={handleSend}
                disabled={isProcessing}
                className="h-12 w-12 rounded-full bg-[#00A884] hover:bg-[#008f6f] text-white shrink-0 flex items-center justify-center shadow-lg mb-1 transition-all active:scale-95"
              >
                {isProcessing ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="h-5 w-5 ml-0.5" />}
              </Button>
           </div>
        </div>
      )}
    </div>
  );
};

export default ImageEditor;