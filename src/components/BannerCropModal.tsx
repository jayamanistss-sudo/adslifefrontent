import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Cropper, { type Area } from 'react-easy-crop';
import { X, Check, ZoomIn } from 'lucide-react';
import { getCroppedImageBlob } from '../utils/cropImage';

// Matches BannerAdRequest.tsx's BANNER_MIN_RATIO/BANNER_MAX_RATIO (2:1–5:1) —
// 3:1 sits comfortably inside that range so anything cropped here always
// passes the size validation that runs right after, instead of vendors
// having to already own a pre-shaped image and getting rejected on mismatch.
const CROP_ASPECT = 3;

export default function BannerCropModal({
  imageSrc, onCancel, onConfirm,
}: {
  readonly imageSrc: string;
  readonly onCancel: () => void;
  readonly onConfirm: (blob: Blob) => void | Promise<void>;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      // Await the parent's upload too — it used to fire-and-forget this,
      // so the spinner cleared as soon as the crop itself was generated,
      // well before the (slower) network upload actually finished, leaving
      // a window where a double-click could fire a second upload attempt.
      await onConfirm(blob);
    } finally {
      setProcessing(false);
    }
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content max-w-lg">
        <div className="modal-header">
          <div className="flex flex-col">
            <h2 className="modal-title">Crop Banner Image</h2>
            <span className="block w-8 h-[2.5px] bg-[var(--primary)] rounded-full mt-1" />
          </div>
          <button onClick={onCancel} className="modal-close"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            Drag to reposition, use the slider to zoom. The frame shows exactly what your banner will look like.
          </p>
          <div className="relative w-full aspect-[3/1] bg-[var(--surface-2)] rounded-xl overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={CROP_ASPECT}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="flex items-center gap-3 mt-4">
            <ZoomIn size={15} className="text-[var(--text-muted)] flex-shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-[var(--primary)]"
              aria-label="Zoom"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onCancel} className="btn btn-secondary flex-1">Cancel</button>
          <button onClick={handleConfirm} disabled={processing || !croppedAreaPixels} className="btn btn-primary flex-1">
            <Check size={16} /> {processing ? 'Applying…' : 'Use This Crop'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
