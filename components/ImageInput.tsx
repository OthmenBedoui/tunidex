
import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, X } from 'lucide-react';

type UploadPreset = 'default' | 'siteLogo' | 'favicon' | 'avatar';

interface ImageInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  uploadPreset?: UploadPreset;
}

const PRESET_CONFIG: Record<UploadPreset, { maxWidth: number; maxHeight: number; quality: number; outputType: 'image/webp' | 'image/png'; previewFit: 'cover' | 'contain'; maxBytes: number }> = {
  default: { maxWidth: 1600, maxHeight: 1600, quality: 0.82, outputType: 'image/webp', previewFit: 'cover', maxBytes: 2_000_000 },
  siteLogo: { maxWidth: 900, maxHeight: 240, quality: 0.86, outputType: 'image/webp', previewFit: 'contain', maxBytes: 700_000 },
  favicon: { maxWidth: 128, maxHeight: 128, quality: 0.9, outputType: 'image/png', previewFit: 'contain', maxBytes: 150_000 },
  avatar: { maxWidth: 512, maxHeight: 512, quality: 0.88, outputType: 'image/webp', previewFit: 'cover', maxBytes: 500_000 },
};

const estimateDataUrlBytes = (dataUrl: string) => {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.floor((base64.length * 3) / 4);
};

const renderCanvasToDataUrl = (
  image: HTMLImageElement,
  width: number,
  height: number,
  outputType: 'image/webp' | 'image/png',
  quality: number
) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error("Impossible de traiter l'image.");
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL(outputType, quality);
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de lire l'image."));
    img.src = src;
  });

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
    reader.readAsDataURL(file);
  });

const processImageFile = async (file: File, preset: UploadPreset) => {
  if (file.type === 'image/svg+xml') {
    return readFileAsDataUrl(file);
  }

  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const { maxWidth, maxHeight, quality, outputType, maxBytes } = PRESET_CONFIG[preset];
  let scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  let attemptQuality = quality;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const processed = renderCanvasToDataUrl(image, width, height, outputType, attemptQuality);

    if (estimateDataUrlBytes(processed) <= maxBytes) {
      return processed;
    }

    scale *= 0.82;
    attemptQuality = Math.max(0.68, attemptQuality - 0.06);
  }

  throw new Error("Image trop lourde. Essaie un fichier plus petit ou un logo PNG/WebP plus simple.");
};

export const ImageInput: React.FC<ImageInputProps> = ({ value, onChange, label, placeholder, uploadPreset = 'default' }) => {
  const [mode, setMode] = useState<'url' | 'upload'>(value.startsWith('data:') ? 'upload' : 'url');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const presetConfig = PRESET_CONFIG[uploadPreset];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsProcessing(true);
        setError('');
        const processedImage = await processImageFile(file, uploadPreset);
        onChange(processedImage);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de l'upload.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const clearImage = () => {
    onChange('');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="block text-xs font-bold uppercase text-slate-500">{label}</label>
        <div className="flex bg-slate-100 p-0.5 rounded-md">
          <button 
            type="button"
            onClick={() => setMode('url')}
            className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${mode === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LinkIcon size={10} className="inline mr-1" /> URL
          </button>
          <button 
            type="button"
            onClick={() => setMode('upload')}
            className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${mode === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Upload size={10} className="inline mr-1" /> Upload
          </button>
        </div>
      </div>

      {mode === 'url' ? (
        <div className="relative">
          <input 
            type="text" 
            className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm" 
            placeholder={placeholder || "https://..."} 
            value={value.startsWith('data:') ? '' : value} 
            onChange={(e) => onChange(e.target.value)} 
          />
          {value && !value.startsWith('data:') && (
            <button onClick={clearImage} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {!value || !value.startsWith('data:') ? (
            <div 
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center transition-all group ${
                isProcessing
                  ? 'border-slate-200 bg-slate-50 cursor-wait'
                  : 'border-slate-200 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50'
              }`}
            >
              <Upload size={24} className="text-slate-300 group-hover:text-indigo-400 mb-2" />
              <span className="text-xs font-medium text-slate-400 group-hover:text-indigo-500">
                {isProcessing ? 'Optimisation en cours...' : 'Cliquez pour uploader'}
              </span>
              <span className="mt-1 text-[10px] text-slate-400 text-center">
                {uploadPreset === 'siteLogo'
                  ? 'Logo PNG/WebP horizontal auto-optimisé pour rester compatible.'
                  : uploadPreset === 'favicon'
                    ? 'Icône optimisée en petit format.'
                    : 'Image automatiquement redimensionnée et compressée.'}
              </span>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
              />
            </div>
          ) : (
            <div className="relative group">
              <img src={value} className={`w-full h-32 rounded-lg border border-slate-200 bg-slate-50 ${presetConfig.previewFit === 'contain' ? 'object-contain p-3' : 'object-cover'}`} alt="Preview" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                <button 
                  type="button"
                  onClick={() => !isProcessing && fileInputRef.current?.click()}
                  className="p-2 bg-white rounded-full text-indigo-600 hover:scale-110 transition-transform"
                >
                  <Upload size={16} />
                </button>
                <button 
                  type="button"
                  onClick={clearImage}
                  className="p-2 bg-white rounded-full text-red-600 hover:scale-110 transition-transform"
                >
                  <X size={16} />
                </button>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
              />
            </div>
          )}
        </div>
      )}
      
      {error && <div className="text-[11px] text-red-500">{error}</div>}

      {value && (
        <div className="flex items-center space-x-2 mt-1">
          <div className="w-6 h-6 rounded border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0">
            <img src={value} className={`w-full h-full ${presetConfig.previewFit === 'contain' ? 'object-contain' : 'object-cover'}`} alt="Thumb" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/24')} />
          </div>
          <span className="text-[10px] text-slate-400 truncate flex-1">{value.startsWith('data:') ? 'Image uploadée' : value}</span>
        </div>
      )}
    </div>
  );
};
