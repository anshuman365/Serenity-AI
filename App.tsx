
import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Menu, Settings, Plus, MessageSquare, 
  Image as ImageIcon, Sparkles, User, Sun, Moon, 
  RefreshCw, Info, Trash2, Globe2, Cpu, Copy, CheckCircle
} from 'lucide-react';
import { generateOpenRouterResponse, classifyUserIntention, summarizeNewsForChat, generateChatTitle } from './services/openRouterService';
import { generateImageHF } from './services/imageService';
import { fetchLatestNews, checkAndNotifyNews } from './services/newsService';
import { saveImageToDb, getAllImagesFromDb, requestStoragePermission } from './services/storage';
import SettingsModal from './components/SettingsModal';
import { ChatSession, Message, AppSettings, PageView, ImageHistoryItem, NewsArticle } from './types';

const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

const DEFAULT_SETTINGS: AppSettings = {
  userName: 'Serenity Intelligence',
  partnerName: 'Operator',
  systemPrompt: `Primary objective: Provide logical and scientific analysis. Maintain high data accuracy and objective reasoning. Use structured headers and bold text for clarity.`,
  customMemories: '',
  themeId: 'midnight',
  fontFamily: 'Inter',
  newsRefreshInterval: 20,
  deepAnalysisMode: true
};

const THEMES = {
  romantic: { gradient: 'from-pink-500 to-purple-600', primary: 'text-pink-500', bgSoft: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800', buttonGradient: 'bg-gradient-to-r from-pink-500 to-purple-600', msgBot: 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700', msgUser: 'bg-gradient-to-br from-pink-500 to-purple-600' },
  ocean: { gradient: 'from-blue-500 to-cyan-500', primary: 'text-blue-500', bgSoft: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', buttonGradient: 'bg-gradient-to-r from-blue-500 to-cyan-600', msgBot: 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700', msgUser: 'bg-gradient-to-br from-blue-500 to-cyan-600' },
  nature: { gradient: 'from-emerald-500 to-teal-600', primary: 'text-emerald-600', bgSoft: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', buttonGradient: 'bg-gradient-to-r from-emerald-500 to-teal-600', msgBot: 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700', msgUser: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
  sunset: { gradient: 'from-orange-500 to-red-500', primary: 'text-orange-600', bgSoft: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', buttonGradient: 'bg-gradient-to-r from-orange-500 to-red-500', msgBot: 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700', msgUser: 'bg-gradient-to-br from-orange-500 to-red-600' },
  midnight: { gradient: 'from-slate-700 to-slate-900', primary: 'text-indigo-400', bgSoft: 'bg-slate-100 dark:bg-slate-800', border: 'border-slate-300 dark:border-slate-700', buttonGradient: 'bg-gradient-to-r from-indigo-600 to-slate-900', msgBot: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700', msgUser: 'bg-gradient-to-br from-slate-700 to-indigo-900' }
};

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageView>('chat');
  const [darkMode, setDarkMode] = useState(() => JSON.parse(localStorage.getItem('serenity_theme_mode') || 'true'));
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('serenity_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });
  const [chats, setChats] = useState<ChatSession[]>(() => JSON.parse(localStorage.getItem('serenity_chats') || '[]'));
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>([]);
  const [cachedNews, setCachedNews] = useState<NewsArticle[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const theme = THEMES[settings.themeId] || THEMES.midnight;

  useEffect(() => {
    localStorage.setItem('serenity_chats', JSON.stringify(chats));
    localStorage.setItem('serenity_settings', JSON.stringify(settings));
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('serenity_theme_mode', JSON.stringify(darkMode));
  }, [chats, settings, darkMode]);

  // Handle Startup: Fresh start on every app open
  useEffect(() => {
    const init = async () => {
      await requestStoragePermission();
      const images = await getAllImagesFromDb();
      setImageHistory(images);
      const news = await fetchLatestNews('science');
      setCachedNews(news);
      checkAndNotifyNews();
      handleCreateNewChat();
    };
    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, currentChatId, isTyping, activePage]);

  const handleCreateNewChat = () => {
    const id = generateId();
    const newChat: ChatSession = { id, title: 'New Analysis', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(id);
    setActivePage('chat');
    setIsSidebarOpen(false);
    setInput('');
  };

  const handleDeleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Permanently archive and delete this session?")) {
      const filtered = chats.filter(c => c.id !== id);
      setChats(filtered);
      if (currentChatId === id) {
        setCurrentChatId(filtered.length > 0 ? filtered[0].id : null);
      }
    }
  };

  const formatMessageContent = (content: string) => {
    // Robust Markdown Parser for Headers, Bold, Italic, and Lists
    let formatted = content
      .replace(/^### (.*$)/gm, '<h3 class="text-indigo-500 font-bold text-base mt-4 mb-2 uppercase tracking-wider">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-indigo-400 font-bold text-lg mt-4 mb-2 border-b border-indigo-500/20 pb-1">$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-indigo-500 dark:text-indigo-400 font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic opacity-90">$1</em>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc mb-1">$1</li>')
      .replace(/\n/g, '<br />');
    
    return <div className="prose prose-sm dark:prose-invert max-w-none font-mono text-[13px] leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  const handleSendMessage = async (textOverride?: string) => {
    const txt = textOverride || input;
    if (!txt.trim() || isTyping) return;
    
    let activeId = currentChatId;
    if (!activeId) {
      activeId = generateId();
      setChats([{ id: activeId, title: txt.slice(0, 20), messages: [], createdAt: Date.now(), updatedAt: Date.now() }, ...chats]);
      setCurrentChatId(activeId);
    }

    const userMsg: Message = { id: generateId(), role: 'user', content: txt, timestamp: Date.now() };
    setChats(prev => prev.map(c => c.id === activeId ? { ...c, messages: [...c.messages, userMsg], updatedAt: Date.now() } : c));
    setInput('');
    setIsTyping(true);

    try {
      const intention = await classifyUserIntention(txt);
      let content = "", imgUrl = undefined, imgId = undefined, articles = [], thought = undefined;

      if (intention.type === 'generate_image') {
        setLoadingAction('Rendering Visualization...');
        const blob = await generateImageHF(intention.query);
        imgUrl = URL.createObjectURL(blob);
        imgId = generateId();
        await saveImageToDb({ id: imgId, url: imgUrl, prompt: intention.query, createdAt: Date.now() }, blob);
        setImageHistory(prev => [{id: imgId!, url: imgUrl!, prompt: intention.query, createdAt: Date.now()}, ...prev]);
        content = "Visual synthesis complete. Logical image component rendered.";
      } else if (intention.type === 'fetch_news') {
        setLoadingAction('Retrieving Empirical Data...');
        articles = await fetchLatestNews(intention.query || 'science', true);
        setCachedNews(articles);
        content = await summarizeNewsForChat(articles, txt, settings.systemPrompt);
      } else {
        setLoadingAction('Logical Processing...');
        const activeChat = chats.find(c => c.id === activeId);
        const history = activeChat ? [...activeChat.messages, userMsg] : [userMsg];
        const res = await generateOpenRouterResponse(history, settings.systemPrompt, settings.deepAnalysisMode);
        content = res.content;
        thought = res.thought;
      }

      const botMsg: Message = { id: generateId(), role: 'assistant', content, image: imgUrl, imageId: imgId, newsArticles: articles, timestamp: Date.now(), thoughtProcess: thought };
      setChats(prev => prev.map(c => c.id === activeId ? { ...c, messages: [...c.messages, botMsg] } : c));
      
      const currentChat = chats.find(c => c.id === activeId);
      if (currentChat && currentChat.messages.length <= 2) {
        generateChatTitle([userMsg, botMsg]).then(t => setChats(prev => prev.map(c => c.id === activeId ? { ...c, title: t } : c)));
      }
    } catch (err: any) {
      setChats(prev => prev.map(c => c.id === activeId ? { ...c, messages: [...c.messages, { id: generateId(), role: 'system', content: "Protocol failure: Connection reset or API limit reached.", timestamp: Date.now() }] } : c));
    } finally {
      setIsTyping(false);
      setLoadingAction(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(id);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const renderChat = () => {
    const activeChat = chats.find(c => c.id === currentChatId);
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden safe-pb">
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {!activeChat || activeChat.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fade-in-up">
              <div className={`w-16 h-16 bg-gradient-to-tr ${theme.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-2xl animate-pulse`}><Cpu size={32} className="text-white"/></div>
              <h3 className="text-xl font-bold font-mono tracking-tight uppercase">Scientific Hub Online</h3>
              <p className="text-[10px] text-slate-500 max-w-xs font-mono uppercase tracking-[0.3em] mt-3">Advanced Logical Processor Ready.</p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                {["Summarize Dark Matter", "Latest Physics Tech", "Logic Chain Analysis", "Quantum Mechanics"].map((prompt, i) => (
                  <button key={i} onClick={() => handleSendMessage(prompt)} className="p-4 text-left text-xs font-mono bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400 shadow-sm">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            activeChat.messages.map(m => (
              <div key={m.id} className={`flex gap-3 max-w-4xl mx-auto ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in-up`}>
                <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm ${m.role === 'user' ? 'bg-slate-700 text-white' : `${theme.buttonGradient} text-white`}`}>{m.role === 'user' ? <User size={14}/> : <Cpu size={14}/>}</div>
                <div className={`flex flex-col gap-2 max-w-[88%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {m.thoughtProcess && (
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border-l-2 border-indigo-500 px-3 py-2 rounded-r-lg text-[10px] font-mono text-indigo-600 dark:text-indigo-400 mb-2">
                      <span className="font-bold uppercase block mb-1">Internal Logic:</span>
                      {formatMessageContent(m.thoughtProcess)}
                    </div>
                  )}
                  <div className={`relative group px-5 py-4 rounded-2xl ${m.role === 'user' ? 'bg-slate-800 text-white rounded-tr-none shadow-lg' : `${theme.msgBot} dark:text-slate-100 border dark:border-slate-700 rounded-tl-none shadow-sm`}`}>
                    {formatMessageContent(m.content)}
                    <button onClick={() => copyToClipboard(m.content, m.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-white/10 dark:bg-black/20 rounded transition-opacity">
                      {copyStatus === m.id ? <CheckCircle size={10} className="text-green-500"/> : <Copy size={10}/>}
                    </button>
                  </div>
                  {m.image && <img src={m.image} className="rounded-xl mt-2 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full h-auto" alt="AI Generated visualization"/>}
                </div>
              </div>
            ))
          )}
          {isTyping && <div className="flex gap-3 max-w-4xl mx-auto items-center animate-pulse"><div className={`w-8 h-8 rounded-lg ${theme.buttonGradient}`}/><div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{loadingAction || 'Processing logic...'}</div></div>}
          <div ref={messagesEndRef} className="h-4"/>
        </div>
        <div className="p-4 bg-white/95 dark:bg-slate-950/95 border-t dark:border-slate-800 backdrop-blur-md">
          <div className="max-w-4xl mx-auto flex gap-3 items-end">
            <textarea 
              ref={textareaRef} 
              value={input} 
              onChange={e=>setInput(e.target.value)} 
              placeholder="Execute analysis query..." 
              className="flex-1 bg-slate-50 dark:bg-slate-900 border-0 ring-1 ring-slate-200 dark:ring-slate-800 focus:ring-2 focus:ring-indigo-500/40 rounded-2xl px-5 py-4 text-sm outline-none resize-none dark:text-white min-h-[56px] max-h-48 font-mono leading-relaxed transition-all shadow-inner" 
              rows={2}
            />
            <button onClick={()=>handleSendMessage()} disabled={!input.trim() || isTyping} className={`p-4 rounded-2xl text-white ${theme.buttonGradient} shadow-xl active:scale-95 flex-shrink-0 transition-transform disabled:opacity-50`}><Send size={22}/></button>
          </div>
          <p className="text-[9px] text-center text-slate-400 mt-3 font-mono uppercase tracking-[0.3em]">Scientific interface | Press Send to synthesize data | Enter for newline</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-100 overflow-hidden" style={{fontFamily: settings.fontFamily}}>
      <aside className={`fixed md:static inset-y-0 z-30 w-72 bg-slate-50 dark:bg-slate-900 border-r dark:border-slate-800 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-12">
            <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${theme.gradient} text-white shadow-lg`}><Sparkles size={20}/></div>
            <h1 className="text-lg font-bold font-mono tracking-tighter uppercase">Serenity AI</h1>
          </div>
          <nav className="space-y-1.5 mb-8">
            {['chat', 'gallery', 'news', 'about'].map(p => (
              <button key={p} onClick={() => { setActivePage(p as any); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl capitalize font-mono text-[11px] uppercase tracking-widest transition-all ${activePage === p ? `${theme.bgSoft} ${theme.primary} font-bold shadow-sm` : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500'}`}>
                {p === 'chat' && <MessageSquare size={16}/>}
                {p === 'gallery' && <ImageIcon size={16}/>}
                {p === 'news' && <Globe2 size={16}/>}
                {p === 'about' && <Info size={16}/>}
                {p}
              </button>
            ))}
          </nav>
          <button onClick={handleCreateNewChat} className="w-full flex items-center justify-center gap-2 py-3.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 hover:border-indigo-500 transition-all mb-6">
            <Plus size={16}/> New Session
          </button>
          <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar">
            {chats.map(c => (
              <div key={c.id} onClick={() => { setCurrentChatId(c.id); setActivePage('chat'); setIsSidebarOpen(false); }} className={`group flex items-center justify-between p-3 rounded-xl text-[11px] font-mono transition-all cursor-pointer ${currentChatId === c.id ? 'bg-slate-200 dark:bg-slate-800 text-indigo-500 font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
                <span className="truncate flex-1">{c.title}</span>
                <button onClick={e => handleDeleteChat(e, c.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-500 transition-opacity"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-4 p-5 mt-6 text-slate-500 border-t dark:border-slate-800 font-mono text-[10px] uppercase tracking-widest hover:text-indigo-500 transition-colors"><Settings size={18}/> Configuration</button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 border-b dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-500"><Menu size={22}/></button>
            <h2 className="font-bold uppercase tracking-[0.3em] text-[10px] font-mono text-slate-400">{activePage} Mode</h2>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleCreateNewChat} 
              className="px-4 py-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all flex items-center justify-center rounded-xl border border-indigo-500/20 shadow-sm active:scale-95" 
              title="New Analysis Session"
            >
              <Plus size={18} />
              <span className="hidden sm:inline text-[10px] ml-2 font-mono font-bold uppercase tracking-widest">New Chat</span>
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500 hover:text-indigo-500 transition-colors bg-slate-100 dark:bg-slate-900 rounded-lg">
              {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
            </button>
          </div>
        </header>
        {activePage === 'chat' && renderChat()}
        {activePage === 'gallery' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
            <h2 className="text-xl font-bold font-mono mb-10 uppercase tracking-[0.2em] flex items-center gap-3"><ImageIcon className="text-indigo-500" size={24}/> Visualization Vault</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {imageHistory.map(img => (
                <div key={img.id} className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-lg border dark:border-slate-800 group relative aspect-square">
                  <img src={img.url} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" alt="Scientific visual synthesis"/>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-6 text-center">
                    <p className="text-[10px] text-white font-mono uppercase tracking-widest leading-relaxed line-clamp-4">{img.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activePage === 'news' && (
           <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-50 dark:bg-slate-950 custom-scrollbar">
             <div className="flex justify-between items-center mb-10 max-w-5xl mx-auto">
               <h2 className="text-xl font-bold font-mono uppercase tracking-[0.2em] flex items-center gap-3"><Globe2 className="text-indigo-500" size={24}/> Empirical Data Log</h2>
               <button onClick={() => fetchLatestNews('science', true).then(setCachedNews)} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"><RefreshCw size={20}/></button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto pb-10">
               {cachedNews.map((n, i) => (
                 <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border dark:border-slate-800 overflow-hidden flex flex-col hover:shadow-xl transition-all hover:-translate-y-1">
                   <img src={n.image} className="h-44 w-full object-cover"/>
                   <div className="p-6 flex-1 flex flex-col">
                     <h3 className="font-bold text-sm mb-3 font-mono line-clamp-2 leading-snug">{n.title}</h3>
                     <p className="text-[11px] text-slate-500 mb-5 line-clamp-3 leading-relaxed flex-1">{n.description}</p>
                     <div className="mt-auto pt-5 border-t dark:border-slate-800 flex justify-between items-center text-[10px] font-mono">
                       <span className="text-slate-400 uppercase">{n.source}</span>
                       <a href={n.url} target="_blank" className="text-indigo-500 font-bold uppercase hover:underline">View Source</a>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           </div>
        )}
        {activePage === 'about' && (
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-mono">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 p-10 rounded-[3rem] border dark:border-slate-800 shadow-2xl text-center">
               <Cpu size={48} className="mx-auto mb-8 text-indigo-500 animate-pulse"/>
               <h2 className="text-2xl font-bold mb-3 uppercase tracking-tighter">Serenity Intelligence</h2>
               <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mb-10">Advanced Production Hub</p>
               <div className="text-left space-y-5 text-[11px] leading-relaxed">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700">
                    <span className="font-bold text-indigo-500 block mb-2 uppercase tracking-widest">Logic Core</span> Optimized for scientific data processing and multi-layered reasoning output.
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700">
                    <span className="font-bold text-indigo-500 block mb-2 uppercase tracking-widest">Data Retention</span> Persistent IndexedDB architecture for immutable news and visualization logs.
                  </div>
               </div>
               <div className="mt-12 pt-8 border-t dark:border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Architect: Anshuman Singh</p>
               </div>
            </div>
          </div>
        )}
      </main>
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} onSave={setSettings}/>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/80 z-20 md:hidden backdrop-blur-md" onClick={() => setIsSidebarOpen(false)}/>}
    </div>
  );
};

export default App;
