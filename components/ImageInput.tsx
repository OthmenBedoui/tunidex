
import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, X } from 'lucide-react';

interface ImageInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}

export const ImageInput: React.FC<ImageInputProps> = ({ value, onChange, label, placeholder }) => {
  const [mode, setMode] = useState<'url' | 'upload'>(value.startsWith('data:') ? 'upload' : 'url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    onChange('');
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
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
            >
              <Upload size={24} className="text-slate-300 group-hover:text-indigo-400 mb-2" />
              <span className="text-xs font-medium text-slate-400 group-hover:text-indigo-500">Cliquez pour uploader</span>
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
              <img src={value} className="w-full h-32 object-cover rounded-lg border border-slate-200" alt="Preview" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
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
      
      {value && (
        <div className="flex items-center space-x-2 mt-1">
          <div className="w-6 h-6 rounded border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0">
            <img src={value} className="w-full h-full object-cover" alt="Thumb" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/24')} />
          </div>
          <span className="text-[10px] text-slate-400 truncate flex-1">{value.startsWith('data:') ? 'Image uploadée' : value}</span>
        </div>
      )}
    </div>
  );
};
