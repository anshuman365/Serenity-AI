
import React, { useState, useEffect, useRef } from 'react';
import { Download, Wand2, Sparkles, ImageOff, Loader2, RefreshCw } from 'lucide-react';
import { getImageBlobById } from '../services/storage';

interface Props {
  imageId: string;
  prompt?: string;
  refinedPrompt?: string;
  className?: string;
}

const ImageDisplay: React.FC<Props> = ({ imageId, prompt, refinedPrompt, className = '' }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showRefinedPrompt, setShowRefinedPrompt] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const loadImage = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(false);
      
      // Cleanup previous URL if refreshing
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      // Check for temporary session cache in localStorage (Chrome local storage fallback)
      if (!forceRefresh) {
        const sessionCache = sessionStorage.getItem(`img_url_${imageId}`);
        if (sessionCache) {
          // Test if URL is still valid (Object URLs die on refresh)
          try {
            const resp = await fetch(sessionCache, { method: 'HEAD' });
            if (resp.ok) {
              setImageUrl(sessionCache);
              setLoading(false);
              return;
            }
          } catch (e) {
            // URL is dead, proceed to IndexedDB recovery
          }
        }
      }
      
      // Load raw data from "Internal Storage" (IndexedDB)
      const blob = await getImageBlobById(imageId);
      
      if (blob) {
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setImageUrl(url);
        
        // Store in session storage for faster access during this browser tab's life
        sessionStorage.setItem(`img_url_${imageId}`, url);
      } else {
        console.warn(`Image ${imageId} not found in IndexedDB`);
        setError(true);
      }
    } catch (err) {
      console.error("Critical error loading image from storage:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (imageId) {
      loadImage();
    }
    
    return () => {
      // We don't immediately revoke here to allow back/forth navigation
      // but a proper app would manage a global cache.
    };
  }, [imageId]);

  const handleDownload = async () => {
    if (!imageUrl) return;
    
    try {
      const blob = await getImageBlobById(imageId);
      if (!blob) throw new Error("Source blob lost");
      
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `serenity-${imageId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
    } catch (err) {
      console.error("Download from internal storage failed:", err);
      alert("Failed to access internal storage for download.");
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center min-h-[200px] border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex flex-col items-center">
          <Loader2 className="animate-spin h-8 w-8 text-blue-500 mb-2" />
          <span className="text-xs text-gray-400 font-medium">Retrieving from storage...</span>
        </div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 rounded-xl flex flex-col items-center justify-center min-h-[200px] p-4 border border-dashed border-gray-300 dark:border-gray-700 ${className}`}>
        <ImageOff size={40} className="text-gray-400 mb-3" />
        <p className="text-sm text-gray-500 text-center font-medium">Image reference lost</p>
        <button 
          onClick={() => loadImage(true)}
          className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 text-xs rounded-lg shadow-sm hover:shadow transition-all border border-gray-200 dark:border-gray-600"
        >
          <RefreshCw size={12} /> Retry Load
        </button>
      </div>
    );
  }

  return (
    <div className={`relative group overflow-hidden rounded-xl shadow-lg ${className}`}>
      <img 
        src={imageUrl} 
        alt={prompt || "Generated image"}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
        onError={() => setError(true)}
      />
      
      {/* Overlay Actions */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
        <button
          onClick={handleDownload}
          className="p-3 bg-white rounded-full text-gray-900 hover:scale-110 transition-transform shadow-xl"
          title="Save to Device"
        >
          <Download size={20}/>
        </button>
      </div>
      
      {/* Fix: Replaced extra closing </div> with )} to correctly terminate the conditional block */}
      {refinedPrompt && refinedPrompt !== prompt && (
        <div className="absolute top-2 left-2 z-10">
          <button
            onClick={() => setShowRefinedPrompt(!showRefinedPrompt)}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold bg-black/60 backdrop-blur-md text-white px-2.5 py-1.5 rounded-full hover:bg-black/80 transition-colors border border-white/20"
          >
            <Sparkles size={10} className="text-blue-400" />
            <span>AI Detail</span>
          </button>
          
          {showRefinedPrompt && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-gray-900/95 backdrop-blur-xl text-white p-4 rounded-2xl shadow-2xl z-20 border border-white/10 animate-in fade-in slide-in-from-top-2">
              <div className="text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-widest">Original Concept</div>
              <div className="text-xs mb-4 italic text-gray-300">"{prompt}"</div>
              
              <div className="text-[10px] text-blue-400 font-bold uppercase mb-1 tracking-widest">AI Refined Prompt</div>
              <div className="text-sm leading-relaxed">{refinedPrompt}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageDisplay;
