import React, { useState } from 'react';
import { generateImageHF } from '../services/imageService';
import { X, Wand2, Download, Loader2, Image as ImageIcon } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImageGenerated: (imageUrl: string) => void;
}

const ImageGenModal: React.FC<Props> = ({ isOpen, onClose, onImageGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setResult(null);
    try {
      const blob = await generateImageHF(prompt);
      const url = URL.createObjectURL(blob);
      setResult(url);
    } catch (error) {
      alert("Failed to generate image. Check API key.");
    } finally {
      setGenerating(false);
    }
  };

  const handleUseImage = () => {
    if (result) {
      onImageGenerated(result);
      onClose();
      // Clean up local state
      setPrompt('');
      setResult(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative bg-white">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Wand2 className="text-indigo-500" />
          Create Imagination
        </h2>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Describe what you want to see..."
            autoFocus
          />
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
            Generate
          </button>
        </div>

        <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden relative">
          {generating && (
            <div className="flex flex-col items-center text-gray-500">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>Dreaming up your image...</p>
            </div>
          )}
          
          {!generating && !result && (
            <div className="flex flex-col items-center text-gray-400">
              <ImageIcon size={48} className="mb-2" />
              <p>Your masterpiece will appear here</p>
            </div>
          )}

          {result && (
            <img 
              src={result} 
              alt="Generated" 
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {result && (
          <div className="mt-4 flex justify-end gap-3">
            <a 
              href={result} 
              download={`serenity-gen-${Date.now()}.png`}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download size={18} />
              Download
            </a>
            <button
              onClick={handleUseImage}
              className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              Send to Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGenModal;