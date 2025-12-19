import React, { useState, useEffect } from 'react';
import { Download, Wand2, Sparkles, ImageOff, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // First check localStorage for cached URL
        const cachedUrls = localStorage.getItem('serenity_image_urls');
        if (cachedUrls) {
          const urlMap = JSON.parse(cachedUrls);
          if (urlMap[imageId]) {
            setImageUrl(urlMap[imageId]);
            setLoading(false);
            return;
          }
        }
        
        // If not in cache, load from IndexedDB
        const blob = await getImageBlobById(imageId);
        
        if (blob) {
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
          
          // Cache the URL in localStorage
          const currentUrls = JSON.parse(localStorage.getItem('serenity_image_urls') || '{}');
          currentUrls[imageId] = url;
          localStorage.setItem('serenity_image_urls', JSON.stringify(currentUrls));
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Failed to load image:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (imageId) {
      loadImage();
    } else {
      setError(true);
      setLoading(false);
    }

    // Clean up URL on unmount
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageId]);

  const handleDownload = async () => {
    if (!imageUrl) return;
    
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `serenity-${imageId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download image");
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center min-h-[200px] ${className}`}>
        <div className="flex flex-col items-center">
          <Loader2 className="animate-spin h-8 w-8 text-blue-500 mb-2" />
          <span className="text-sm text-gray-500">Loading image...</span>
        </div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 rounded-xl flex flex-col items-center justify-center min-h-[200px] p-4 ${className}`}>
        <ImageOff size={48} className="text-gray-400 mb-2" />
        <p className="text-sm text-gray-500 text-center">Image not found</p>
        {prompt && (
          <p className="text-xs text-gray-400 mt-2 text-center line-clamp-2">Prompt: {prompt}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`}>
      <img 
        src={imageUrl} 
        alt={prompt || "Generated image"}
        className="rounded-xl shadow-lg border-4 border-white dark:border-gray-700 w-full h-full object-cover"
        onError={() => setError(true)}
      />
      
      <button
        onClick={handleDownload}
        className="absolute bottom-2 right-2 p-2 bg-white/90 rounded-full shadow-md text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
        title="Download image"
      >
        <Download size={16}/>
      </button>
      
      {refinedPrompt && refinedPrompt !== prompt && (
        <div className="absolute top-2 left-2">
          <button
            onClick={() => setShowRefinedPrompt(!showRefinedPrompt)}
            className="flex items-center gap-1 text-xs bg-black/70 text-white px-2 py-1 rounded-lg hover:bg-black/90 transition-colors"
            title="Show enhanced prompt"
          >
            <Wand2 size={10} />
            <span>Enhanced</span>
          </button>
          
          {showRefinedPrompt && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-black/90 text-white p-3 rounded-lg shadow-xl z-10">
              <div className="text-xs text-gray-300 mb-1">Original:</div>
              <div className="text-sm mb-2 line-clamp-2">{prompt}</div>
              
              <div className="text-xs text-blue-300 mb-1">Enhanced:</div>
              <div className="text-sm font-medium line-clamp-3">{refinedPrompt}</div>
              
              <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-2">
                <Sparkles size={8} />
                AI-enhanced for better results
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageDisplay;