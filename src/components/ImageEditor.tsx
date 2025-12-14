"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Area } from "react-easy-crop/types";
import { X, RotateCw, Send, Crop as CropIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import getCroppedImg from "@/utils/canvasUtils";
import { Slider } from "@/components/ui/slider";

interface ImageEditorProps {
  file: File;
  onClose: () => void;
  onSend: (blob: Blob, caption: string) => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ file, onClose, onSend }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [caption, setCaption] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageSrc(reader.result?.toString() || "");
    });
    reader.readAsDataURL(file);
    return () => {
      // Cleanup if needed
    };
  }, [file]);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSend = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onSend(croppedImage, caption);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top Bar */}
      <div className="flex justify-between items-center p-4 text-white z-10 bg-gradient-to-b from-black/50 to-transparent">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 rounded-full">
          <X className="h-6 w-6" />
        </Button>
        <div className="flex gap-4">
          <Button variant="ghost" size="icon" onClick={() => setRotation(r => r + 90)} className="text-white hover:bg-white/20 rounded-full">
            <RotateCw className="h-6 w-6" />
          </Button>
          {/* We could add aspect ratio toggles here if needed */}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 relative bg-black w-full h-full overflow-hidden">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={undefined} // Free crop by default like whatsapp
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          classes={{
            containerClassName: "bg-black",
            mediaClassName: "" 
          }}
          showGrid={true}
        />
      </div>

      {/* Bottom Bar */}
      <div className="p-4 bg-black/80 backdrop-blur-sm pb-safe flex flex-col gap-4">
        {/* Caption Input */}
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-zinc-800 rounded-full px-4 py-2 flex items-center">
                <Input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="bg-transparent border-none text-white placeholder:text-zinc-400 focus-visible:ring-0 p-0 h-auto"
                    autoFocus
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
            </div>
            <Button 
                size="icon" 
                className="rounded-full h-12 w-12 bg-green-500 hover:bg-green-600 text-white shrink-0 shadow-lg"
                onClick={handleSend}
                disabled={isProcessing}
            >
                <Send className="h-5 w-5 ml-0.5" />
            </Button>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;