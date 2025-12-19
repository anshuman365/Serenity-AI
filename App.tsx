import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Menu, Settings, Plus, MessageSquare, 
  Image as ImageIcon, Newspaper, Sparkles, Bot, 
  ChevronLeft, User, Sun, Moon,
  RefreshCw, ExternalLink, Download, Info, Heart, Globe, Github,
  Zap, Camera, Feather, Smile, Trash2,
  Code, BookOpen, Cpu, Lightbulb, Wand2
} from 'lucide-react';
import { generateOpenRouterResponse, classifyUserIntention, summarizeNewsForChat, generateChatTitle } from './services/openRouterService';
import { generateImageHF, type ImageGenerationResult } from './services/imageService';
import { fetchLatestNews, checkAndNotifyNews } from './services/newsService';
import { fetchBackendKeys } from './services/config';
import { saveImageToDb, getAllImagesFromDb, requestStoragePermission } from './services/storage';
import SettingsModal from './components/SettingsModal';
import { ChatSession, Message, AppSettings, PageView, ImageHistoryItem, NewsArticle } from './types';

const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

const DEFAULT_SETTINGS: AppSettings = {
  userName: 'User',
  partnerName: 'Serenity AI',
  systemPrompt: 'You are Serenity AI, a sophisticated AI assistant designed to provide intelligent, accurate, and helpful responses. You are knowledgeable in technology, science, creative arts, and general topics. You communicate in clear, professional English. Your responses should be well-structured, factual when possible, and appropriately detailed based on the query. Admit when you don\'t know something and offer to help with related topics.',
  customMemories: '',
  themeId: 'ocean',
  fontFamily: 'Inter',
  newsRefreshInterval: 20
};

const THEMES = {
  romantic: {
    gradient: 'from-pink-500 to-purple-600',
    primary: 'text-pink-500',
    bgSoft: 'bg-pink-50 dark:bg-pink-900/20',
    border: 'border-pink-200 dark:border-pink-800',
    buttonGradient: 'bg-gradient-to-r from-pink-500 to-purple-600',
    msgBot: 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700',
    msgUser: 'bg-gradient-to-br from-pink-500 to-purple-600',
  },
  ocean: {
    gradient: 'from-blue-500 to-cyan-500',
    primary: 'text-blue-500',
    bgSoft: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    buttonGradient: 'bg-gradient-to-r from-blue-500 to-cyan-600',
    msgBot: 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700',
    msgUser: 'bg-gradient-to-br from-blue-500 to-cyan-600',
  },
  nature: {
    gradient: 'from-emerald-500 to-teal-600',
    primary: 'text-emerald-600',
    bgSoft: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    buttonGradient: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    msgBot: 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700',
    msgUser: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  },
  sunset: {
    gradient: 'from-orange-500 to-red-500',
    primary: 'text-orange-600',
    bgSoft: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
    buttonGradient: 'bg-gradient-to-r from-orange-500 to-red-500',
    msgBot: 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700',
    msgUser: 'bg-gradient-to-br from-orange-500 to-red-600',
  },
  midnight: {
    gradient: 'from-gray-700 to-gray-900',
    primary: 'text-gray-600 dark:text-gray-300',
    bgSoft: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-600',
    buttonGradient: 'bg-gradient-to-r from-gray-700 to-black',
    msgBot: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600',
    msgUser: 'bg-gradient-to-br from-gray-700 to-gray-900',
  }
};

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageView>('chat');
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('serenity_theme_mode');
      return saved ? JSON.parse(saved) : true;
    } catch { return true; }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('serenity_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  const [chats, setChats] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('serenity_chats');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>([]);
  const [cachedNews, setCachedNews] = useState<NewsArticle[]>(() => {
    try {
      const saved = localStorage.getItem('serenity_news_cache');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [expandedRefinements, setExpandedRefinements] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const theme = THEMES[settings.themeId] || THEMES.ocean;

  useEffect(() => {
    const savedChats = localStorage.getItem('serenity_chats');
    if (savedChats) {
      try {
        setChats(JSON.parse(savedChats));
      } catch { }
    }
    
    const hydrateImages = async () => {
      const dbImages = await getAllImagesFromDb();
      setImageHistory(dbImages);
    };
    
    hydrateImages();
    requestStoragePermission();
  }, []);

  useEffect(() => {
    localStorage.setItem('serenity_chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem('serenity_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, currentChatId, isTyping, activePage]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + 'px';
    }
  }, [input]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('serenity_theme_mode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    fetchBackendKeys();
    fetchLatestNews('technology', false).then(setCachedNews);
    
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      console.log("Checking for updates...");
      checkAndNotifyNews();
      fetchLatestNews('technology', false).then(setCachedNews); 
    }, settings.newsRefreshInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [settings.newsRefreshInterval]);

  const handleCreateNewChat = () => {
    const newChat: ChatSession = {
      id: generateId(),
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setChats([newChat, ...chats]);
    setCurrentChatId(newChat.id);
    setActivePage('chat');
    setIsSidebarOpen(false);
    setInput('');
  };

  const handleDeleteChat = (e: React.MouseEvent, chatIdToDelete: string) => {
    e.stopPropagation();
    
    if (window.confirm("Are you sure you want to delete this conversation?")) {
      const updatedChats = chats.filter(c => c.id !== chatIdToDelete);
      setChats(updatedChats);
      
      if (currentChatId === chatIdToDelete) {
        if (updatedChats.length > 0) {
          setCurrentChatId(updatedChats[0].id);
        } else {
          setCurrentChatId(null);
        }
      }
    }
  };

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;
    
    let activeChatId = currentChatId;
    let activeChats = [...chats];
    
    if (!activeChatId) {
      handleCreateNewChat();
      await new Promise(resolve => setTimeout(resolve, 50));
      activeChatId = currentChatId;
      activeChats = chats;
    }

    const userMsg: Message = { 
      id: generateId(), 
      role: 'user', 
      content: textToSend, 
      timestamp: Date.now() 
    };
    
    setChats(prev => prev.map(c => c.id === activeChatId ? {
      ...c, messages: [...c.messages, userMsg], updatedAt: Date.now()
    } : c));
    
    setInput('');
    if(textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsTyping(true);

    try {
      const intention = await classifyUserIntention(userMsg.content);
      console.log("Intention:", intention);

      let botContent = "";
      let generatedImageUrl = undefined;
      let generatedImageId = undefined;
      let newsArticlesForChat: NewsArticle[] = [];
      let imageGenerationDetails: { originalPrompt: string; refinedPrompt: string } | null = null;

      if (intention.type === 'generate_image') {
        setLoadingAction('Refining Prompt & Generating Image...');
        
        const result: ImageGenerationResult = await generateImageHF(intention.query);
        generatedImageUrl = URL.createObjectURL(result.blob);
        generatedImageId = generateId();
        
        const newImgItem: ImageHistoryItem = {
          id: generatedImageId,
          url: generatedImageUrl,
          prompt: result.originalPrompt,
          refinedPrompt: result.refinedPrompt,
          createdAt: Date.now()
        };
        
        await saveImageToDb(newImgItem, result.blob);
        
        setImageHistory(prev => [newImgItem, ...prev]);
        
        imageGenerationDetails = {
          originalPrompt: result.originalPrompt,
          refinedPrompt: result.refinedPrompt
        };
        
        botContent = `I've enhanced your prompt and generated this image using ${result.source}.`;
        
      } else if (intention.type === 'fetch_news') {
        setLoadingAction('Fetching News...');
        const articles = await fetchLatestNews(intention.query || 'technology', true);
        setCachedNews(articles);
        newsArticlesForChat = articles;
        botContent = await summarizeNewsForChat(articles, userMsg.content, settings.systemPrompt);
        
      } else {
        const currentChat = activeChats.find(c => c.id === activeChatId);
        const history = currentChat ? [...currentChat.messages, userMsg] : [userMsg];
        const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        const fullPrompt = `
          Current Date: ${today}
          ${settings.systemPrompt}
          User Name: ${settings.userName}
          AI Name: ${settings.partnerName}
          User Preferences: ${settings.customMemories}
        `;
        
        botContent = await generateOpenRouterResponse(history, fullPrompt);
      }

      const botMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: botContent,
        image: generatedImageUrl,
        imageId: generatedImageId,
        newsArticles: newsArticlesForChat.length > 0 ? newsArticlesForChat : undefined,
        timestamp: Date.now(),
        metadata: imageGenerationDetails ? {
          imageGeneration: imageGenerationDetails
        } : undefined
      };

      setChats(prev => prev.map(c => c.id === activeChatId ? {
        ...c, messages: [...c.messages, botMsg]
      } : c));

      const chatContext = activeChats.find(c => c.id === activeChatId);
      const fullHistory = chatContext ? [...chatContext.messages, userMsg, botMsg] : [userMsg, botMsg];

      if (fullHistory.length === 2 || fullHistory.length === 4) {
        generateChatTitle(fullHistory).then(newTitle => {
           if (newTitle) {
             setChats(currentChats => currentChats.map(c => 
               c.id === activeChatId ? { ...c, title: newTitle } : c
             ));
           }
        });
      }

    } catch (error: any) {
      console.error(error);
      const isKeyError = error.message.includes('API Key') || error.message.includes('missing');
      const errM: Message = { 
        id: generateId(), 
        role: 'system', 
        content: isKeyError 
          ? "I apologize, but I'm having trouble connecting to the AI service. Please check your API key in Settings." 
          : error.message || "I encountered a network issue. Please try again.", 
        timestamp: Date.now() 
      };
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, errM] } : c));
      
      if (isKeyError) {
        setShowSettings(true); 
      }
    } finally {
      setIsTyping(false);
      setLoadingAction(null);
    }
  };

  const renderChat = () => {
    const activeChat = chats.find(c => c.id === currentChatId);
    
    const suggestions = [
      { icon: Cpu, text: "Explain quantum computing basics" },
      { icon: Code, text: "Write a Python function to sort data" },
      { icon: BookOpen, text: "Summarize today's tech news" },
      { icon: Lightbulb, text: "Suggest a creative project idea" }
    ];

    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden safe-pb">
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
           {(!activeChat || !currentChatId) && (
             <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fade-in-up">
               <div className={`w-28 h-28 bg-gradient-to-tr ${theme.gradient} rounded-full flex items-center justify-center mb-6 shadow-2xl ring-4 ring-white dark:ring-gray-800`}>
                 <Bot size={56} className="text-white drop-shadow-md" />
               </div>
               <h3 className="text-3xl font-bold dark:text-gray-100 mb-2">Hello, {settings.userName}</h3>
               <p className="dark:text-gray-400 mb-8 max-w-xs mx-auto">I'm {settings.partnerName}. How can I assist you today?</p>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                 {suggestions.map((s, idx) => (
                   <button 
                     key={idx}
                     onClick={() => {
                       if (!currentChatId) {
                         handleCreateNewChat();
                         setTimeout(() => handleSendMessage(s.text), 100);
                       } else {
                         handleSendMessage(s.text);
                       }
                     }}
                     className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left group"
                   >
                     <div className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-700 ${theme.primary} group-hover:scale-110 transition-transform`}>
                        <s.icon size={18}/>
                     </div>
                     <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{s.text}</span>
                   </button>
                 ))}
               </div>
             </div>
           )}
           
           {activeChat?.messages.map(msg => {
             const imgItem = msg.imageId ? imageHistory.find(img => img.id === msg.imageId) : null;
             
             return (
               <div key={msg.id} className={`flex gap-3 md:gap-4 max-w-3xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                 <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-gray-800 dark:bg-gray-600 text-white' : `${theme.msgUser} text-white`}`}>
                   {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                 </div>
                 <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                   <div className={`px-4 py-3 md:px-5 md:py-3.5 rounded-2xl shadow-sm text-sm whitespace-pre-wrap leading-relaxed ${msg.role === 'user' ? 'bg-gray-800 dark:bg-gray-700 text-white rounded-tr-sm' : `${theme.msgBot} border text-gray-700 dark:text-gray-200 rounded-tl-sm`}`}>
                     {msg.content}
                   </div>
                   
                   {msg.image && (
                     <div className="relative group">
                       <img src={msg.image} alt="Generated" className="rounded-xl shadow-lg border-4 border-white dark:border-gray-700 max-w-full bg-gray-200 dark:bg-gray-800 min-h-[200px]" />
                       <a 
                         href={msg.image} 
                         download={`serenity-${Date.now()}.png`}
                         className="absolute bottom-2 right-2 p-2 bg-white/90 rounded-full shadow-md text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                         <Download size={16}/>
                       </a>
                       
                       {imgItem?.refinedPrompt && imgItem.refinedPrompt !== imgItem.prompt && (
                         <div className="mt-2">
                           <button
                             onClick={() => {
                               const newExpanded = new Set(expandedRefinements);
                               if (newExpanded.has(msg.imageId!)) {
                                 newExpanded.delete(msg.imageId!);
                               } else {
                                 newExpanded.add(msg.imageId!);
                               }
                               setExpandedRefinements(newExpanded);
                             }}
                             className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
                           >
                             <Wand2 size={12} />
                             <span>View Enhanced Prompt</span>
                           </button>
                           
                           {expandedRefinements.has(msg.imageId!) && (
                             <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                               <div className="mb-2">
                                 <div className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">Your Original Prompt</div>
                                 <div className="text-gray-600 dark:text-gray-300 text-sm">
                                   {imgItem.prompt}
                                 </div>
                               </div>
                               
                               <div className="mb-2">
                                 <div className="text-blue-500 text-[10px] uppercase tracking-wider mb-1 font-medium">AI-Enhanced Version</div>
                                 <div className="text-gray-800 dark:text-gray-100 text-sm font-medium">
                                   {imgItem.refinedPrompt}
                                 </div>
                               </div>
                               
                               <div className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                                 <Sparkles size={10} />
                                 Enhanced with AI for better image quality
                               </div>
                             </div>
                           )}
                         </div>
                       )}
                     </div>
                   )}

                   {msg.newsArticles && msg.newsArticles.length > 0 && (
                     <div className="w-full overflow-hidden">
                       <div className="flex gap-3 overflow-x-auto pb-2 pt-1 custom-scrollbar snap-x -mx-1 px-1">
                         {msg.newsArticles.map((article, idx) => (
                           <a 
                             key={idx} 
                             href={article.url} 
                             target="_blank" 
                             rel="noreferrer"
                             className="flex-shrink-0 w-[85vw] max-w-[280px] bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-all group snap-start"
                           >
                             <div className="h-32 overflow-hidden relative">
                               <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                               <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                             </div>
                             <div className="p-3">
                               <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 line-clamp-2 mb-1 leading-tight">{article.title}</h4>
                               <div className="flex items-center justify-between text-[10px] text-gray-500">
                                 <span className="truncate max-w-[70%]">{article.source}</span>
                                 <ExternalLink size={10} />
                               </div>
                             </div>
                           </a>
                         ))}
                       </div>
                     </div>
                   )}

                   <span className="text-[10px] text-gray-400 select-none">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                 </div>
               </div>
             );
           })}
           
           {isTyping && (
             <div className="flex gap-4 max-w-3xl mx-auto items-center animate-in fade-in duration-300">
                <div className={`w-8 h-8 rounded-full ${theme.msgUser} flex items-center justify-center text-white animate-pulse`}>
                  <Bot size={14}/>
                </div>
                <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 text-xs text-gray-500 flex items-center gap-2 shadow-sm">
                   {loadingAction ? (
                     <span className="font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-500 animate-pulse">{loadingAction}</span>
                   ) : (
                     <div className="flex gap-1.5 h-full items-center">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"/>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"/>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"/>
                     </div>
                   )}
                </div>
             </div>
           )}
           <div ref={messagesEndRef} className="h-2"/>
        </div>
        
        <div className="p-3 md:p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 pb-safe">
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <textarea 
              ref={textareaRef}
              value={input} 
              onChange={e=>setInput(e.target.value)} 
              placeholder={`Message ${settings.partnerName}...`}
              className="flex-1 bg-white dark:bg-gray-800 border-0 ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-blue-400 rounded-2xl px-5 py-3 shadow-sm transition-all outline-none dark:text-white resize-none min-h-[48px] max-h-32 custom-scrollbar text-base"
              rows={1}
            />
            <button 
              onClick={() => handleSendMessage()} 
              disabled={!input.trim() || isTyping} 
              className={`p-3 md:p-3.5 rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 mb-1 ${!input.trim() || isTyping ? 'bg-gray-200 dark:bg-gray-700 text-gray-400' : `${theme.buttonGradient} text-white`}`}
            >
              <Send size={20}/>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderGallery = () => (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50 dark:bg-gray-900 safe-pb custom-scrollbar">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 dark:text-white"><ImageIcon className="text-blue-500"/> Generated Images</h2>
      {imageHistory.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No images generated yet. Try asking me to create an image!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {imageHistory.map(img => (
            <div key={img.id} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-700 group">
              <div className="relative aspect-square">
                <img src={img.url} alt={img.prompt} className="w-full h-full object-cover"/>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a href={img.url} download={`serenity-${img.id}.png`} className="p-3 bg-white rounded-full text-gray-900 hover:scale-110 transition-transform"><Download size={20}/></a>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-1">{img.prompt}</p>
                {img.refinedPrompt && img.refinedPrompt !== img.prompt && (
                  <div className="flex items-center gap-1 text-[10px] text-blue-500 mt-1">
                    <Wand2 size={10} />
                    <span>AI-enhanced prompt</span>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">{new Date(img.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderNews = () => (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50 dark:bg-gray-900 safe-pb custom-scrollbar">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 dark:text-white"><Newspaper className="text-purple-500"/> Latest Updates</h2>
        <button 
           onClick={() => fetchLatestNews('technology', true).then(setCachedNews)}
           className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-gray-500 hover:text-purple-500"
        >
          <RefreshCw size={20}/>
        </button>
      </div>
      <div className="grid gap-4 max-w-4xl mx-auto">
        {cachedNews.length === 0 ? (
          <div className="text-center py-20 text-gray-400">Loading or no news available...</div>
        ) : (
          cachedNews.map((n, i) => (
            <div key={i} className="flex flex-col md:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-blue-200 transition-colors">
              <img src={n.image} alt={n.title} className="w-full md:w-48 h-32 object-cover rounded-lg"/>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-2">{n.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{n.description}</p>
                <div className="flex justify-between items-center text-xs text-gray-400">
                   <span>{n.source} • {new Date(n.publishedAt).toLocaleDateString()}</span>
                   <a href={n.url} target="_blank" className="text-purple-500 hover:underline">Read more</a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderAbout = () => (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50 dark:bg-gray-900 safe-pb flex items-center justify-center custom-scrollbar">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-r ${theme.gradient} opacity-20`}></div>
        <div className="relative z-10 flex flex-col items-center text-center">
           <div className={`w-24 h-24 rounded-full bg-gradient-to-tr ${theme.gradient} flex items-center justify-center text-white mb-6 shadow-lg`}>
              <Sparkles size={40}/>
           </div>
           <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Serenity AI</h2>
           <p className="text-gray-500 dark:text-gray-400 mb-8">Intelligent AI Assistant & Creative Partner</p>
           
           <div className="grid gap-4 w-full text-left mb-8">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                 <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2"><User size={18} className="text-blue-500"/> About</h3>
                 <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Serenity AI is a sophisticated assistant designed to help with research, creative tasks, technical problems, and intelligent conversation.</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                 <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2"><Code size={18} className="text-cyan-500"/> Capabilities</h3>
                 <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">AI Chat • Image Generation • News Analysis • Technical Assistance • Creative Writing</p>
              </div>
           </div>

           <a 
             href="https://anshuman365.github.io" 
             target="_blank" 
             rel="noreferrer"
             className={`flex items-center gap-2 px-6 py-3 rounded-full ${theme.buttonGradient} text-white font-medium shadow-md hover:scale-105 transition-transform`}
           >
             <Globe size={18}/> Developer's Website
           </a>
           <p className="text-xs text-gray-400 mt-6">Created by Anshuman Singh</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-100 transition-colors duration-300" style={{fontFamily: settings.fontFamily}}>
      <aside className={`fixed md:static inset-y-0 z-30 w-72 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex flex-col h-full p-4 safe-pb">
          <div className="flex items-center justify-between mb-8 px-2 mt-2">
            <h1 className={`text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${theme.gradient} flex items-center gap-2`}>
              <div className={`p-1.5 rounded-lg ${theme.buttonGradient} text-white`}><Sparkles size={20}/></div>
              Serenity AI
            </h1>
            <button onClick={()=>setIsSidebarOpen(false)} className="md:hidden text-gray-400 p-2"><ChevronLeft/></button>
          </div>
          <nav className="space-y-2 mb-6">
            <button onClick={() => { setActivePage('chat'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activePage === 'chat' ? `${theme.bgSoft} ${theme.primary} font-medium` : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <MessageSquare size={20}/> Chat
            </button>
            <button onClick={() => { setActivePage('gallery'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activePage === 'gallery' ? `${theme.bgSoft} ${theme.primary} font-medium` : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <ImageIcon size={20}/> Gallery
            </button>
            <button onClick={() => { setActivePage('news'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activePage === 'news' ? `${theme.bgSoft} ${theme.primary} font-medium` : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <Newspaper size={20}/> News Feed
            </button>
            <button onClick={() => { setActivePage('about'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activePage === 'about' ? `${theme.bgSoft} ${theme.primary} font-medium` : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <Info size={20}/> About
            </button>
          </nav>
          <button onClick={handleCreateNewChat} className={`w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 dark:border-gray-700 p-3 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-all mb-4`}>
             <Plus size={18}/> New Conversation
          </button>
          <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
            {chats.map(c => (
              <div 
                key={c.id} 
                onClick={()=>{setCurrentChatId(c.id); setActivePage('chat'); setIsSidebarOpen(false);}} 
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer text-sm transition-colors ${currentChatId === c.id ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
              >
                <span className="truncate flex-1 pr-2">{c.title}</span>
                <button 
                  onClick={(e) => handleDeleteChat(e, c.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                  title="Delete Conversation"
                >
                  <Trash2 size={14}/>
                </button>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full ${theme.buttonGradient} flex items-center justify-center text-white font-bold`}>AI</div>
                <div className="text-sm font-medium">{settings.partnerName}</div>
             </div>
             <button onClick={()=>setShowSettings(true)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><Settings size={18}/></button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full relative">
         <header className="h-16 flex items-center justify-between px-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20">
            <div className="flex items-center gap-3">
               <button onClick={()=>setIsSidebarOpen(true)} className="md:hidden p-2 text-gray-500"><Menu/></button>
               <h2 className="font-semibold text-gray-800 dark:text-white capitalize">{activePage}</h2>
            </div>
            <button onClick={()=>setDarkMode(!darkMode)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
               {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
            </button>
         </header>

         {activePage === 'chat' && renderChat()}
         {activePage === 'gallery' && renderGallery()}
         {activePage === 'news' && renderNews()}
         {activePage === 'about' && renderAbout()}
      </div>

      <SettingsModal isOpen={showSettings} onClose={()=>setShowSettings(false)} settings={settings} onSave={setSettings}/>
      
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm" onClick={()=>setIsSidebarOpen(false)}/>}
    </div>
  );
};

export default App;