'use client';

import { useState, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

interface PhotoCropModalProps {
  imageFile: File;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function getCroppedBlob(imageSrc: string, crop: Area): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      0.95,
    );
  });
}

export default function PhotoCropModal({ imageFile, onCropComplete, onCancel }: PhotoCropModalProps) {
  const [imageSrc, setImageSrc] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [confirmTap, setConfirmTap] = useState(false);
  const [cancelTap, setCancelTap] = useState(false);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(imageFile);
    return () => reader.abort();
  }, [imageFile]);

  const handleCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels || !imageSrc) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      onCropComplete(blob);
    } catch (err) {
      console.error('Crop failed:', err);
      setProcessing(false);
    }
  }

  function flash(setter: (v: boolean) => void) {
    setter(true);
    setTimeout(() => setter(false), 200);
  }

  if (!imageSrc) {
    return (
      <div className="fixed inset-0 bg-[#111111] z-[60] flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Loading image...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#111111] z-[60] flex flex-col">
      {/* Crop area */}
      <div className="relative flex-1 min-h-0">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="rect"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
          style={{
            containerStyle: { background: '#111111' },
            cropAreaStyle: { borderColor: '#00AEEF' },
          }}
        />
      </div>

      {/* Zoom slider */}
      <div className="px-8 py-3 bg-[#111111]">
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-[#00AEEF]"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 px-6 py-4 bg-[#111111] border-t border-zinc-800">
        <button
          type="button"
          onClick={() => { flash(setCancelTap); onCancel(); }}
          className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-[14px] font-outfit font-semibold text-sm"
          style={{
            transition: 'transform 200ms ease',
            transform: cancelTap ? 'scale(0.95)' : 'scale(1)',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => { flash(setConfirmTap); handleConfirm(); }}
          disabled={processing}
          className="flex-1 py-3 text-white rounded-[14px] font-outfit font-bold text-sm disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #00AEEF, #0088CC)',
            transition: 'transform 200ms ease',
            transform: confirmTap ? 'scale(0.95)' : 'scale(1)',
          }}
        >
          {processing ? 'Processing...' : 'Confirm'}
        </button>
      </div>
    </div>
  );
}
