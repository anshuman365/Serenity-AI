import React, { useEffect, useState } from 'react';
import { fetchLatestNews } from '../services/newsService';
import { NewsArticle } from '../types';
import { Newspaper, ExternalLink, Loader2, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const NewsWidget: React.FC<Props> = ({ isOpen, onClose }) => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && news.length === 0) {
      loadNews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadNews = async () => {
    setLoading(true);
    const articles = await fetchLatestNews('life style');
    setNews(articles);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white/95 backdrop-blur-xl shadow-2xl transform transition-transform duration-300 z-40 flex flex-col border-l border-white/50">
      <div className="p-4 flex items-center justify-between border-b border-gray-100">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Newspaper size={20} className="text-purple-500" />
          Latest Updates
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-purple-500" size={32} />
          </div>
        ) : (
          news.map((item, idx) => (
            <div key={idx} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <img 
                src={item.image} 
                alt={item.title} 
                className="w-full h-32 object-cover rounded-lg mb-3"
              />
              <h4 className="font-semibold text-gray-800 leading-tight mb-2">{item.title}</h4>
              <p className="text-sm text-gray-500 line-clamp-2 mb-2">{item.description}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-400">{item.source}</span>
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-500 hover:text-purple-600"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NewsWidget;