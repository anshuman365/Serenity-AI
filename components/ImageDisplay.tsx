import React, { useState, useEffect, useCallback } from 'react';
import { Download, Wand2, Sparkles, ImageOff, Loader2, AlertCircle } from 'lucide-react';
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

  const loadImage = useCallback(async () => {
    if (!imageId) {
      setError(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(false);
      
      console.log('Loading image:', imageId);
      const blob = await getImageBlobById(imageId);
      
      if (blob && blob.size > 0) {
        const url = URL.createObjectURL(blob);
        console.log('Created blob URL for image:', imageId, 'Size:', blob.size);
        setImageUrl(url);
      } else {
        console.error('No blob or empty blob for image:', imageId);
        setError(true);
      }
    } catch (err) {
      console.error('Failed to load image:', imageId, err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [imageId]);

  useEffect(() => {
    loadImage();

    // Cleanup function
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageId, loadImage]);

  const handleRetry = () => {
    loadImage();
  };

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
      alert("Failed to download image. Please try again.");
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
        <p className="text-sm text-gray-500 text-center mb-2">Image not found or failed to load</p>
        <button
          onClick={handleRetry}
          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          Retry Loading
        </button>
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
        onError={() => {
          console.error('Image failed to load from URL:', imageUrl);
          setError(true);
        }}
      />
      
      <button
        onClick={handleDownload}
        className="absolute bottom-2 right-2 p-2 bg-white/90 rounded-full shadow-md text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
        title="Download image"
      >
        <Download size={16}/>
      </button>
      
      {refinedPrompt && refinedPrompt !== prompt && (
        <div className="absolute top-2 left-2 z-10">
          <button
            onClick={() => setShowRefinedPrompt(!showRefinedPrompt)}
            className="flex items-center gap-1 text-xs bg-black/70 text-white px-2 py-1 rounded-lg hover:bg-black/90 transition-colors"
            title="Show enhanced prompt"
          >
            <Wand2 size={10} />
            <span>Enhanced</span>
          </button>
          
          {showRefinedPrompt && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-black/90 text-white p-3 rounded-lg shadow-xl z-20">
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