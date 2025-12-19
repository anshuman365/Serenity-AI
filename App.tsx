
import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Menu, Settings, Plus, MessageSquare, 
  Image as ImageIcon, Newspaper, Sparkles, Bot, 
  ChevronLeft, User, Sun, Moon,
  RefreshCw, ExternalLink, Download, Info, Heart, Globe, Github,
  Zap, Camera, Feather, Smile, Trash2,
  Code, BookOpen, Cpu, Lightbulb, Wand2, Clock,
  Volume2, VolumeX, Mic, MicOff, Music
} from 'lucide-react';
import { generateOpenRouterResponse, classifyUserIntention, summarizeNewsForChat, generateChatTitle } from './services/openRouterService';
import { generateImageHF, type ImageGenerationResult } from './services/imageService';
import { fetchLatestNews, checkAndNotifyNews, formatRelativeTime } from './services/newsService';
import { fetchBackendKeys } from './services/config';
import { saveImageToDb, getAllImagesFromDb, requestStoragePersistence, getImageBlobById } from './services/storage';
import { speakText, stopSpeech } from './services/speechService';
import SettingsModal from './components/SettingsModal';
import ImageDisplay from './components/ImageDisplay';
import MarkdownRenderer from './components/MarkdownRenderer';
import { ChatSession, Message, AppSettings, PageView, ImageHistoryItem, NewsArticle } from './types';

const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

const DEFAULT_SETTINGS: AppSettings = {
  userName: 'Serenity AI',
  partnerName: 'User',
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
    bgSoft: 'bg-pink-50 dark:bg-pink-950/40',
    border: 'border-pink-200 dark:border-pink-800/50',
    buttonGradient: 'bg-gradient-to-br from-pink-500 to-purple-600',
    msgBot: 'bg-white/80 dark:bg-slate-900/80',
    msgUser: 'bg-gradient-to-br from-pink-500 to-purple-600',
  },
  ocean: {
    gradient: 'from-blue-600 to-indigo-600',
    primary: 'text-blue-500',
    bgSoft: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800/50',
    buttonGradient: 'bg-gradient-to-br from-blue-600 to-indigo-600',
    msgBot: 'bg-white/80 dark:bg-slate-900/80',
    msgUser: 'bg-gradient-to-br from-blue-600 to-indigo-600',
  },
  nature: {
    gradient: 'from-emerald-500 to-teal-600',
    primary: 'text-emerald-600',
    bgSoft: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    buttonGradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    msgBot: 'bg-white/80 dark:bg-slate-900/80',
    msgUser: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  },
  sunset: {
    gradient: 'from-orange-500 to-red-500',
    primary: 'text-orange-600',
    bgSoft: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-200 dark:border-orange-800/50',
    buttonGradient: 'bg-gradient-to-br from-orange-500 to-red-500',
    msgBot: 'bg-white/80 dark:bg-slate-900/80',
    msgUser: 'bg-gradient-to-br from-orange-500 to-red-600',
  },
  midnight: {
    gradient: 'from-slate-700 to-slate-900',
    primary: 'text-slate-400',
    bgSoft: 'bg-slate-100 dark:bg-slate-900/40',
    border: 'border-slate-300 dark:border-slate-800/50',
    buttonGradient: 'bg-gradient-to-br from-slate-700 to-slate-950',
    msgBot: 'bg-white/80 dark:bg-slate-900/80',
    msgUser: 'bg-gradient-to-br from-slate-700 to-slate-900',
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
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const theme = THEMES[settings.themeId] || THEMES.ocean;

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await requestStoragePersistence();
        const dbImages = await getAllImagesFromDb();
        setImageHistory(dbImages);
        const savedChats = localStorage.getItem('serenity_chats');
        if (savedChats) setChats(JSON.parse(savedChats));
        refreshNewsData();
      } catch (error) {
        console.error("Error initializing app storage:", error);
      }
    };
    initializeApp();
  }, []);

  const refreshNewsData = async () => {
    setIsNewsLoading(true);
    try {
      const articles = await fetchLatestNews('top tech world', true);
      setCachedNews(articles);
    } finally {
      setIsNewsLoading(false);
    }
  };

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
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('serenity_theme_mode', JSON.stringify(darkMode));
  }, [darkMode]);

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
    if (window.confirm("Delete this conversation?")) {
      const updatedChats = chats.filter(c => c.id !== chatIdToDelete);
      setChats(updatedChats);
      if (currentChatId === chatIdToDelete) {
        setCurrentChatId(updatedChats.length > 0 ? updatedChats[0].id : null);
      }
    }
  };

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;
    
    let activeChatId = currentChatId;
    if (!activeChatId) {
      const newId = generateId();
      const newChat: ChatSession = {
        id: newId,
        title: 'New Conversation',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newId);
      activeChatId = newId;
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
    setIsTyping(true);

    try {
      const intention = await classifyUserIntention(userMsg.content);
      let botContent = "";
      let generatedImageId = undefined;
      let newsArticlesForChat: NewsArticle[] = [];
      let imageGenerationDetails: { originalPrompt: string; refinedPrompt: string } | null = null;

      if (intention.type === 'generate_image') {
        setLoadingAction('Painting your vision...');
        const result: ImageGenerationResult = await generateImageHF(intention.query);
        generatedImageId = generateId();
        const newImgItem: ImageHistoryItem = {
          id: generatedImageId,
          url: '',
          prompt: result.originalPrompt,
          refinedPrompt: result.refinedPrompt,
          createdAt: Date.now()
        };
        await saveImageToDb(newImgItem, result.blob);
        setImageHistory(prev => [newImgItem, ...prev]);
        imageGenerationDetails = { originalPrompt: result.originalPrompt, refinedPrompt: result.refinedPrompt };
        botContent = `I've materialized your imagination. You can find it in your gallery.`;
      } else if (intention.type === 'fetch_news') {
        setLoadingAction('Scanning global updates...');
        const articles = await fetchLatestNews(intention.query || 'technology', true);
        newsArticlesForChat = articles;
        botContent = await summarizeNewsForChat(articles, userMsg.content, settings.systemPrompt);
      } else {
        const activeChat = chats.find(c => c.id === activeChatId);
        const history = activeChat ? [...activeChat.messages, userMsg] : [userMsg];
        const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const fullPrompt = `Current Date: ${today}\n${settings.systemPrompt}\nUser: ${settings.partnerName}\nAI: ${settings.userName}`;
        botContent = await generateOpenRouterResponse(history, fullPrompt);
      }

      const botMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: botContent,
        imageId: generatedImageId,
        newsArticles: newsArticlesForChat.length > 0 ? newsArticlesForChat : undefined,
        timestamp: Date.now(),
        metadata: imageGenerationDetails ? { imageGeneration: imageGenerationDetails } : undefined
      };

      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, botMsg] } : c));

      // Voice output if enabled
      if (isVoiceEnabled) {
        setIsSpeaking(true);
        speakText(botContent).finally(() => setIsSpeaking(false));
      }

      const currentChat = chats.find(c => c.id === activeChatId);
      if (currentChat && currentChat.messages.length <= 2) {
        generateChatTitle([...currentChat.messages, userMsg, botMsg]).then(newTitle => {
           if (newTitle) setChats(curr => curr.map(c => c.id === activeChatId ? { ...c, title: newTitle } : c));
        });
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsTyping(false);
      setLoadingAction(null);
    }
  };

  const renderChat = () => {
    const activeChat = chats.find(c => c.id === currentChatId);
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden chat-container">
        <div className="flex-1 overflow-y-auto p-4 md:px-6 space-y-8 custom-scrollbar pt-8">
           {(!activeChat || !currentChatId) && (
             <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fade-in-up">
               <div className={`w-28 h-28 bg-gradient-to-tr ${theme.gradient} rounded-3xl flex items-center justify-center mb-8 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500 relative group`}>
                 <Bot size={56} className="text-white group-hover:scale-110 transition-transform" />
                 {isSpeaking && (
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-full h-full border-4 border-white rounded-3xl animate-ping opacity-20" />
                    </div>
                 )}
               </div>
               <h3 className="text-3xl font-bold dark:text-gray-100 mb-3 tracking-tight">Hello {settings.partnerName}</h3>
               <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-sm mx-auto text-sm leading-relaxed">
                 Experience the power of advanced intelligence coupled with a beautiful design.
               </p>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
                 {[
                   { icon: Cpu, text: "Explain Artificial Neural Networks", sub: "Tech Insight" },
                   { icon: Code, text: "Design a landing page in React", sub: "Web Development" },
                   { icon: BookOpen, text: "Latest advancements in Physics", sub: "Science Feed" },
                   { icon: Lightbulb, text: "Creative business strategies", sub: "Ideation" }
                 ].map((s, idx) => (
                   <button 
                     key={idx}
                     onClick={() => handleSendMessage(s.text)}
                     className="flex flex-col gap-1 p-5 glass-morphism rounded-2xl text-left hover:scale-[1.02] active:scale-[0.98] transition-all group"
                   >
                     <div className={`p-2.5 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 ${theme.primary} w-fit group-hover:bg-blue-500 group-hover:text-white transition-colors mb-2`}>
                        <s.icon size={20}/>
                     </div>
                     <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{s.sub}</span>
                     <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{s.text}</span>
                   </button>
                 ))}
               </div>
             </div>
           )}
           
           {activeChat?.messages.map((msg, idx) => (
             <div key={msg.id} className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-message`}>
               <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg border border-white/10 ${msg.role === 'user' ? 'bg-slate-800 text-white' : `${theme.buttonGradient} text-white`}`}>
                 {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
               </div>
               <div className={`flex flex-col gap-2 flex-1 min-w-0 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                 <div className={`px-5 py-3.5 rounded-2xl shadow-sm text-sm break-words max-w-[90%] md:max-w-[80%] ${
                   msg.role === 'user' 
                     ? 'bg-slate-800 dark:bg-slate-700 text-white rounded-tr-none' 
                     : `glass-morphism text-slate-700 dark:text-slate-200 rounded-tl-none border-gray-100 dark:border-white/5`
                 }`}>
                   {msg.role === 'assistant' ? (
                     <MarkdownRenderer content={msg.content} />
                   ) : (
                     <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                   )}
                 </div>
                 
                 {msg.imageId && (
                   <div className="mt-3 w-full max-w-md group overflow-hidden rounded-2xl shadow-2xl border border-white/10">
                     <ImageDisplay
                       imageId={msg.imageId}
                       prompt={msg.metadata?.imageGeneration?.originalPrompt}
                       refinedPrompt={msg.metadata?.imageGeneration?.refinedPrompt}
                       className="aspect-square w-full"
                     />
                   </div>
                 )}

                 {msg.newsArticles && msg.newsArticles.length > 0 && (
                   <div className="w-full mt-3 overflow-hidden">
                     <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x max-w-full">
                       {msg.newsArticles.map((article, i) => (
                         <a key={i} href={article.url} target="_blank" className="flex-shrink-0 w-[75vw] sm:w-80 glass-morphism rounded-3xl overflow-hidden hover:scale-[1.02] transition-transform snap-start group border border-white/5 shadow-xl">
                            <div className="h-36 overflow-hidden relative">
                              <img src={article.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                              <div className="absolute top-3 right-3 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full text-[8px] text-white font-black uppercase tracking-[0.2em]">
                                {article.source}
                              </div>
                              <div className="absolute bottom-3 left-4 flex items-center gap-1.5 text-[10px] text-white/80 font-bold">
                                <Clock size={12} className="text-blue-400" />
                                {formatRelativeTime(article.publishedAt)}
                              </div>
                            </div>
                            <div className="p-5">
                              <h4 className="text-sm font-black dark:text-white line-clamp-2 leading-tight mb-3 tracking-tight group-hover:text-blue-500 transition-colors">{article.title}</h4>
                              <div className="flex items-center text-blue-500 font-black text-[10px] gap-2 tracking-[0.15em]">
                                EXPLORE DEPTH <ExternalLink size={12} />
                              </div>
                            </div>
                         </a>
                       ))}
                     </div>
                   </div>
                 )}
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-medium">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    {msg.role === 'assistant' && (
                       <button 
                        onClick={() => {
                          setIsSpeaking(true);
                          speakText(msg.content).finally(() => setIsSpeaking(false));
                        }} 
                        className="text-gray-400 hover:text-blue-500 p-1 rounded-lg transition-colors"
                        title="Read Aloud"
                       >
                         <Volume2 size={12}/>
                       </button>
                    )}
                 </div>
               </div>
             </div>
           ))}
           
           {isTyping && (
             <div className="flex gap-4 max-w-4xl mx-auto items-center">
                <div className={`w-10 h-10 rounded-2xl ${theme.buttonGradient} flex items-center justify-center text-white animate-pulse`}>
                  <Bot size={18}/>
                </div>
                <div className="glass-morphism px-5 py-3 rounded-2xl text-[11px] font-bold tracking-widest text-blue-500 uppercase flex items-center gap-3">
                   <div className="flex gap-1">
                     <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                     <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                     <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                   </div>
                   {loadingAction || "Synthesizing Response..."}
                </div>
             </div>
           )}
           <div ref={messagesEndRef} className="h-8"/>
        </div>
        
        <div className="p-4 md:p-6 bg-white/40 dark:bg-slate-950/40 backdrop-blur-3xl border-t border-white/5 pb-safe">
          <div className="max-w-4xl mx-auto flex items-end gap-2 md:gap-3 glass-morphism p-1.5 md:p-2 rounded-3xl inner-glow">
            <button 
              onClick={() => {
                if(isSpeaking) stopSpeech();
                setIsVoiceEnabled(!isVoiceEnabled);
              }}
              className={`p-3 rounded-2xl transition-all ${isVoiceEnabled ? 'bg-blue-500/10 text-blue-500 shadow-inner' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              title={isVoiceEnabled ? "Voice Enabled" : "Voice Disabled"}
            >
              {isVoiceEnabled ? <Volume2 size={24}/> : <VolumeX size={24}/>}
            </button>
            <textarea 
              ref={textareaRef}
              value={input} 
              onChange={e=>setInput(e.target.value)} 
              placeholder={`Communicate with ${settings.userName}...`}
              className="flex-1 bg-transparent border-0 focus:ring-0 px-2 md:px-4 py-3 outline-none dark:text-white resize-none min-h-[48px] max-h-32 text-sm md:text-base font-medium placeholder:text-gray-400"
              rows={1}
            />
            <button 
              onClick={() => handleSendMessage()} 
              disabled={!input.trim() || isTyping} 
              className={`p-3 md:p-3.5 rounded-2xl shadow-xl transition-all transform hover:scale-105 active:scale-95 mb-0.5 ${!input.trim() || isTyping ? 'bg-slate-200 dark:bg-slate-800 text-slate-400' : `${theme.buttonGradient} text-white`}`}
            >
              <Send size={20}/>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 transition-colors duration-500" style={{fontFamily: settings.fontFamily}}>
      <aside className={`fixed md:static inset-y-0 z-40 w-80 glass-morphism border-r-0 transform transition-transform duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex flex-col h-full p-6 safe-pb">
          <div className="flex items-center justify-between mb-12 px-2">
            <h1 className={`text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r ${theme.gradient} flex items-center gap-3 tracking-tighter`}>
              <div className={`p-2 rounded-2xl ${theme.buttonGradient} text-white shadow-lg shadow-blue-500/20`}><Sparkles size={24}/></div>
              SERENITY
            </h1>
            <button onClick={()=>setIsSidebarOpen(false)} className="md:hidden text-gray-400 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><ChevronLeft/></button>
          </div>
          
          <nav className="space-y-1.5 mb-8">
            {[
              { id: 'chat', icon: MessageSquare, label: 'Intelligent Chat' },
              { id: 'gallery', icon: ImageIcon, label: 'Creative Vault' },
              { id: 'news', icon: Newspaper, label: 'Global Intel' },
              { id: 'about', icon: Info, label: 'About Agency' }
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => { setActivePage(item.id as any); setIsSidebarOpen(false); }} 
                className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${activePage === item.id ? `${theme.bgSoft} ${theme.primary} shadow-sm border border-white/5` : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <item.icon size={20} strokeWidth={2.5}/> {item.label}
              </button>
            ))}
          </nav>
          
          <button onClick={handleCreateNewChat} className={`w-full flex items-center justify-center gap-3 ${theme.buttonGradient} p-4 rounded-2xl text-white shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-transform mb-8 text-sm font-black tracking-widest uppercase`}>
             <Plus size={20}/> New Intelligence
          </button>

          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2 pb-6">
            <h4 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Historical Archive</h4>
            {chats.map(c => (
              <div 
                key={c.id} 
                onClick={()=>{setCurrentChatId(c.id); setActivePage('chat'); setIsSidebarOpen(false);}} 
                className={`group flex items-center justify-between p-3.5 rounded-2xl cursor-pointer text-xs transition-all duration-300 ${currentChatId === c.id ? 'bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white font-bold ring-1 ring-white/5 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-300'}`}
              >
                <span className="truncate flex-1 pr-2 tracking-tight">{c.title}</span>
                <button onClick={(e) => handleDeleteChat(e, c.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                  <Trash2 size={14}/>
                </button>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl ${theme.buttonGradient} flex items-center justify-center text-white font-black text-xs shadow-lg relative`}>
                   AI
                   {isSpeaking && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />}
                </div>
                <div>
                  <div className="text-xs font-black tracking-tight">{settings.userName}</div>
                  <div className="text-[9px] font-bold text-green-500 uppercase tracking-widest">Connected</div>
                </div>
             </div>
             <button onClick={()=>setShowSettings(true)} className="p-2.5 glass-morphism text-slate-500 hover:text-blue-500 rounded-2xl transition-all"><Settings size={20}/></button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full relative">
         <header className="h-16 flex items-center justify-between px-6 bg-white/40 dark:bg-slate-950/40 backdrop-blur-3xl border-b border-white/5 sticky top-0 z-30">
            <div className="flex items-center gap-4">
               <button onClick={()=>setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-500 glass-morphism rounded-xl"><Menu size={20}/></button>
               <h2 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-[0.3em]">{activePage} Mode</h2>
            </div>
            <div className="flex items-center gap-2">
              {isSpeaking && <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 glass-morphism rounded-xl text-[9px] font-black text-blue-500 uppercase tracking-widest mr-2 animate-pulse"><Volume2 size={12}/> Serenity Speaking...</div>}
              <button onClick={()=>setDarkMode(!darkMode)} className="p-2.5 text-slate-500 hover:text-blue-500 glass-morphism rounded-2xl transition-all">
                {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
              </button>
            </div>
         </header>

         {activePage === 'chat' && renderChat()}
         {activePage === 'gallery' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-gray-50 dark:bg-slate-950 safe-pb custom-scrollbar">
              <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                  <div>
                    <h2 className="text-4xl font-black flex items-center gap-4 dark:text-white tracking-tighter">
                      <ImageIcon className="text-blue-500" size={40}/> IMAGINATION VAULT
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">Your AI-generated artistic expressions, persisted locally.</p>
                  </div>
                  <div className="flex gap-3">
                     <div className="glass-morphism px-6 py-3 rounded-2xl text-center">
                        <div className="text-2xl font-black text-blue-500">{imageHistory.length}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Assets</div>
                     </div>
                  </div>
                </header>

                {imageHistory.length === 0 ? (
                  <div className="text-center py-40 glass-morphism rounded-3xl">
                    <div className="w-20 h-20 mx-auto bg-slate-100 dark:bg-slate-900 rounded-3xl flex items-center justify-center text-slate-400 mb-6 border border-white/5">
                      <Sparkles size={40} />
                    </div>
                    <p className="text-xl font-bold dark:text-white">Empty Canvas</p>
                    <p className="text-gray-500 mt-2 text-sm">Initiate an image generation in chat to populate your gallery.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {imageHistory.map((img, idx) => (
                      <div key={img.id} className="group animate-message" style={{animationDelay: `${idx * 0.05}s`}}>
                        <div className="glass-morphism rounded-3xl overflow-hidden inner-glow transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2">
                          <div className="aspect-square relative">
                            <ImageDisplay imageId={img.id} prompt={img.prompt} refinedPrompt={img.refinedPrompt} className="w-full h-full" />
                          </div>
                          <div className="p-5">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed h-8 mb-4">"{img.prompt}"</p>
                            <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-4">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(img.createdAt).toLocaleDateString()}</span>
                              <button onClick={() => {}} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
         )}
         {activePage === 'news' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-gray-50 dark:bg-slate-950 safe-pb custom-scrollbar">
              <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-end mb-12">
                  <div>
                    <h2 className="text-4xl font-black flex items-center gap-4 dark:text-white tracking-tighter">
                      <Newspaper className="text-purple-500" size={40}/> GLOBAL INTEL
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">Synthesized real-time updates from verified agencies.</p>
                  </div>
                  <button 
                    onClick={refreshNewsData} 
                    disabled={isNewsLoading}
                    className="p-3 glass-morphism rounded-2xl text-slate-500 hover:text-purple-500 hover:scale-110 transition-all disabled:opacity-50"
                  >
                    <RefreshCw size={24} className={isNewsLoading ? "animate-spin" : ""}/>
                  </button>
                </div>

                {isNewsLoading && cachedNews.length === 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="h-80 glass-morphism rounded-3xl animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {cachedNews.map((n, i) => (
                      <div key={i} className="flex flex-col glass-morphism rounded-[32px] overflow-hidden inner-glow group animate-message shadow-xl border border-white/5" style={{animationDelay: `${i * 0.05}s`}}>
                        <div className="h-48 overflow-hidden relative">
                          <img src={n.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"/>
                          <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-white">
                            {n.source}
                          </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                          <div className="flex items-center gap-2 text-[10px] text-purple-500 font-black uppercase tracking-widest mb-3">
                            <Clock size={12} />
                            {formatRelativeTime(n.publishedAt)}
                          </div>
                          <h3 className="font-black text-xl text-slate-900 dark:text-white mb-3 tracking-tight leading-snug group-hover:text-purple-500 transition-colors line-clamp-2">{n.title}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 font-medium mb-6">{n.description}</p>
                          <div className="mt-auto flex justify-between items-center pt-4 border-t border-gray-100 dark:border-white/5">
                             <a href={n.url} target="_blank" className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-black text-[11px] uppercase tracking-[0.15em] hover:translate-x-1 transition-transform">
                               ACCESS FULL INTEL <ExternalLink size={14}/>
                             </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
         )}
         {activePage === 'about' && (
           <div className="flex-1 overflow-y-auto p-4 md:p-8 flex items-center justify-center bg-gray-50 dark:bg-slate-950">
             <div className="max-w-xl w-full glass-morphism p-10 rounded-[40px] text-center inner-glow relative overflow-hidden group">
               <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-1000" />
               <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-1000" />
               
               <div className={`w-24 h-24 mx-auto rounded-[30px] ${theme.buttonGradient} flex items-center justify-center text-white mb-8 shadow-2xl rotate-12 group-hover:rotate-0 transition-transform duration-500`}>
                 <Sparkles size={48} />
               </div>
               <h2 className="text-4xl font-black mb-3 dark:text-white tracking-tighter">SERENITY AI</h2>
               <p className="text-slate-500 dark:text-slate-400 text-sm mb-10 font-medium tracking-wide uppercase">Next-Generation Neural Workspace</p>
               
               <div className="grid grid-cols-2 gap-4 mb-10">
                 <div className="p-5 glass-morphism rounded-3xl text-left">
                   <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-2">Developed By</h4>
                   <p className="text-sm font-bold dark:text-white">Anshuman Singh</p>
                   <p className="text-[10px] text-blue-500 font-black mt-1 uppercase">Lead Architect</p>
                 </div>
                 <div className="p-5 glass-morphism rounded-3xl text-left">
                   <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-2">Intelligence</h4>
                   <p className="text-sm font-bold dark:text-white">Gemini 2.0</p>
                   <p className="text-[10px] text-purple-500 font-black mt-1 uppercase">Flash Engine</p>
                 </div>
               </div>
               
               <button className={`w-full py-4 rounded-2xl text-white font-black tracking-[0.2em] shadow-2xl ${theme.buttonGradient} hover:scale-[1.02] transition-transform uppercase text-xs`}>
                 Documentation & Assets
               </button>
             </div>
           </div>
         )}
      </div>

      <SettingsModal isOpen={showSettings} onClose={()=>setShowSettings(false)} settings={settings} onSave={setSettings}/>
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-950/60 z-30 md:hidden backdrop-blur-md transition-opacity duration-500" onClick={()=>setIsSidebarOpen(false)}/>}
    </div>
  );
};

export default App;
