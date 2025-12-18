
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
  systemPrompt: `You are Serenity AI. Always provide highly structured, scientific, and logical answers. Use headers (###) for sections and bold text (**word**) for key terms. Maintain a professional tone.`,
  customMemories: '',
  themeId: 'midnight',
  fontFamily: 'Inter',
  newsRefreshInterval: 20,
  deepAnalysisMode: true
};

const THEMES = {
  midnight: { 
    gradient: 'from-slate-800 to-indigo-950', 
    primary: 'text-indigo-400', 
    bgSoft: 'bg-indigo-50 dark:bg-indigo-950/30', 
    border: 'border-slate-200 dark:border-slate-800', 
    buttonGradient: 'bg-gradient-to-r from-indigo-600 to-violet-700', 
    msgBot: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800', 
    msgUser: 'bg-slate-800 dark:bg-indigo-900' 
  }
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
  const theme = THEMES.midnight; // Defaulting to midnight for stability

  useEffect(() => {
    localStorage.setItem('serenity_chats', JSON.stringify(chats));
    localStorage.setItem('serenity_settings', JSON.stringify(settings));
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('serenity_theme_mode', JSON.stringify(darkMode));
  }, [chats, settings, darkMode]);

  // App Startup Logic: Always start fresh
  useEffect(() => {
    const init = async () => {
      await requestStoragePermission();
      const imgs = await getAllImagesFromDb();
      setImageHistory(imgs);
      const news = await fetchLatestNews('science');
      setCachedNews(news);
      checkAndNotifyNews();
      handleCreateNewChat(); // Start new session on every load
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
    if (window.confirm("Archiving session. Proceed with deletion?")) {
      const filtered = chats.filter(c => c.id !== id);
      setChats(filtered);
      if (currentChatId === id) {
        setCurrentChatId(filtered.length > 0 ? filtered[0].id : null);
      }
    }
  };

  const renderMarkdown = (content: string) => {
    // Robust parser for scientific output
    let html = content
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h3 class="border-b border-indigo-500/20 pb-1">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic opacity-80">$1</em>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/\n/g, '<br />');

    // Wrap list items in <ul> if they exist
    if (html.includes('<li>')) {
      html = html.replace(/(<li>.*<\/li>)/gms, '<ul class="my-2">$1</ul>');
    }

    return <div className="prose prose-sm dark:prose-invert font-mono text-[13px] leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
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
        content = "Visual core initialized. Scientific visualization rendered.";
      } else if (intention.type === 'fetch_news') {
        setLoadingAction('Retrieving Empirical Data...');
        articles = await fetchLatestNews(intention.query || 'science', true);
        setCachedNews(articles);
        content = await summarizeNewsForChat(articles, txt, settings.systemPrompt);
      } else {
        setLoadingAction('Logical Processing...');
        const currentChat = chats.find(c => c.id === activeId);
        const history = currentChat ? [...currentChat.messages, userMsg] : [userMsg];
        const res = await generateOpenRouterResponse(history, settings.systemPrompt, settings.deepAnalysisMode);
        content = res.content;
        thought = res.thought;
      }

      const botMsg: Message = { id: generateId(), role: 'assistant', content, image: imgUrl, imageId: imgId, newsArticles: articles, timestamp: Date.now(), thoughtProcess: thought };
      setChats(prev => prev.map(c => c.id === activeId ? { ...c, messages: [...c.messages, botMsg] } : c));
      
      const updatedChat = chats.find(c => c.id === activeId);
      if (updatedChat && updatedChat.messages.length <= 2) {
        generateChatTitle([userMsg, botMsg]).then(t => setChats(prev => prev.map(c => c.id === activeId ? { ...c, title: t } : c)));
      }
    } catch (err: any) {
      const errMsg: Message = { id: generateId(), role: 'system', content: "Protocol Fault: Logical connection reset. Please re-execute.", timestamp: Date.now() };
      setChats(prev => prev.map(c => c.id === activeId ? { ...c, messages: [...c.messages, errMsg] } : c));
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
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-slate-50 dark:bg-black/20">
          {!activeChat || activeChat.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fade-in-up">
              <div className={`w-16 h-16 bg-gradient-to-tr ${theme.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-2xl animate-pulse`}><Cpu size={32} className="text-white"/></div>
              <h3 className="text-xl font-bold font-mono tracking-tight uppercase dark:text-white">Neural Hub Online</h3>
              <p className="text-[10px] text-slate-500 max-w-xs font-mono uppercase tracking-[0.3em] mt-3">Advanced Scientific Interface v10.03.07</p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                {["Summarize CRISPR logic", "Analyze fusion energy", "Dark matter theories", "Quantum entanglement"].map((prompt, i) => (
                  <button key={i} onClick={() => handleSendMessage(prompt)} className="p-4 text-left text-xs font-mono bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all text-slate-600 dark:text-slate-400">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            activeChat.messages.map(m => (
              <div key={m.id} className={`flex gap-3 max-w-4xl mx-auto ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in-up`}>
                <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center shadow-md ${m.role === 'user' ? 'bg-slate-700 text-white' : `${theme.buttonGradient} text-white`}`}>{m.role === 'user' ? <User size={16}/> : <Cpu size={16}/>}</div>
                <div className={`flex flex-col gap-2 max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {m.thoughtProcess && (
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border-l-2 border-indigo-500 px-4 py-3 rounded-r-xl text-[10px] font-mono text-indigo-600 dark:text-indigo-400 mb-1 max-w-full">
                      <span className="font-bold uppercase block mb-1 tracking-widest text-[8px]">Core Reasoning:</span>
                      {renderMarkdown(m.thoughtProcess)}
                    </div>
                  )}
                  <div className={`relative group px-5 py-4 rounded-2xl shadow-sm ${m.role === 'user' ? 'bg-slate-800 text-white rounded-tr-none' : `${theme.msgBot} dark:text-slate-100 border dark:border-slate-800 rounded-tl-none`}`}>
                    {renderMarkdown(m.content)}
                    <button onClick={() => copyToClipboard(m.content, m.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-white/10 dark:bg-black/30 rounded-lg transition-all hover:bg-white/20">
                      {copyStatus === m.id ? <CheckCircle size={12} className="text-green-500"/> : <Copy size={12}/>}
                    </button>
                  </div>
                  {m.image && <img src={m.image} className="rounded-2xl mt-2 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full h-auto transform hover:scale-[1.02] transition-transform"/>}
                </div>
              </div>
            ))
          )}
          {isTyping && (
            <div className="flex gap-3 max-w-4xl mx-auto items-center animate-pulse">
              <div className={`w-9 h-9 rounded-xl ${theme.buttonGradient}`}/>
              <div className="text-[10px] text-indigo-500 font-mono uppercase tracking-[0.2em]">{loadingAction || 'Processing protocol...'}</div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-6"/>
        </div>
        
        <div className="p-4 md:p-6 bg-white/80 dark:bg-black/80 border-t dark:border-slate-800 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto flex gap-3 items-end">
            <textarea 
              ref={textareaRef} 
              value={input} 
              onChange={e=>setInput(e.target.value)} 
              placeholder="Execute analysis query..." 
              className="flex-1 bg-white dark:bg-slate-900 border dark:border-slate-800 focus:ring-2 focus:ring-indigo-500/40 rounded-2xl px-5 py-4 text-sm outline-none resize-none dark:text-white min-h-[56px] max-h-48 font-mono leading-relaxed shadow-inner" 
              rows={1}
            />
            <button 
              onClick={()=>handleSendMessage()} 
              disabled={!input.trim() || isTyping} 
              className={`p-4 rounded-2xl text-white ${theme.buttonGradient} shadow-xl active:scale-95 flex-shrink-0 transition-all disabled:opacity-50`}
            >
              <Send size={24}/>
            </button>
          </div>
          <p className="text-[9px] text-center text-slate-400 mt-3 font-mono uppercase tracking-[0.4em]">Press Send to synthesize data | Enter for multi-line support</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-100 overflow-hidden" style={{fontFamily: settings.fontFamily}}>
      <aside className={`fixed md:static inset-y-0 z-30 w-72 bg-white dark:bg-slate-950 border-r dark:border-slate-800 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${theme.gradient} text-white shadow-lg`}><Sparkles size={22}/></div>
            <h1 className="text-xl font-bold font-mono tracking-tighter uppercase">Serenity</h1>
          </div>
          
          <nav className="space-y-1.5 mb-8">
            {['chat', 'gallery', 'news', 'about'].map(p => (
              <button key={p} onClick={() => { setActivePage(p as any); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl capitalize font-mono text-[11px] uppercase tracking-widest transition-all ${activePage === p ? `bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 font-bold shadow-sm` : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500'}`}>
                {p === 'chat' && <MessageSquare size={18}/>}
                {p === 'gallery' && <ImageIcon size={18}/>}
                {p === 'news' && <Globe2 size={18}/>}
                {p === 'about' && <Info size={18}/>}
                {p}
              </button>
            ))}
          </nav>
          
          <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest px-4 mb-3">Archived Sessions</p>
            {chats.map(c => (
              <div key={c.id} onClick={() => { setCurrentChatId(c.id); setActivePage('chat'); setIsSidebarOpen(false); }} className={`group flex items-center justify-between p-3 rounded-xl text-[11px] font-mono transition-all cursor-pointer ${currentChatId === c.id ? 'bg-slate-100 dark:bg-slate-900 text-indigo-500 font-bold shadow-inner' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}>
                <span className="truncate flex-1">{c.title}</span>
                <button onClick={e => handleDeleteChat(e, c.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-500 transition-opacity"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
          
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-4 p-5 mt-6 text-slate-500 border-t dark:border-slate-900 font-mono text-[10px] uppercase tracking-widest hover:text-indigo-500 transition-colors"><Settings size={20}/> Configuration</button>
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-white dark:bg-black">
        <header className="h-16 flex items-center justify-between px-6 border-b dark:border-slate-800 bg-white/70 dark:bg-black/70 backdrop-blur-2xl sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-500"><Menu size={24}/></button>
            <h2 className="font-bold uppercase tracking-[0.4em] text-[10px] font-mono text-slate-400 ml-1">{activePage} Mode</h2>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleCreateNewChat} 
              className="px-4 py-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all flex items-center justify-center rounded-xl border border-indigo-500/20 shadow-sm active:scale-95"
            >
              <Plus size={18} />
              <span className="hidden sm:inline text-[9px] ml-2 font-mono font-bold uppercase tracking-widest">New Session</span>
            </button>
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className="p-2.5 text-slate-500 hover:text-indigo-500 transition-colors flex items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-xl"
            >
              {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
            </button>
          </div>
        </header>
        
        {activePage === 'chat' && renderChat()}
        
        {activePage === 'gallery' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
            <h2 className="text-2xl font-bold font-mono mb-10 uppercase tracking-[0.3em] flex items-center gap-3 dark:text-white"><ImageIcon className="text-indigo-500" size={28}/> Visual Archives</h2>
            {imageHistory.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 font-mono text-xs uppercase tracking-widest gap-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                No visual synthesis data found.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {imageHistory.map(img => (
                  <div key={img.id} className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-lg border dark:border-slate-800 group relative aspect-square">
                    <img src={img.url} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700"/>
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 text-center">
                      <p className="text-[10px] text-white font-mono uppercase tracking-widest leading-relaxed line-clamp-4">{img.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activePage === 'news' && (
           <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
             <div className="flex justify-between items-center mb-10 max-w-5xl mx-auto">
               <h2 className="text-2xl font-bold font-mono uppercase tracking-[0.3em] flex items-center gap-3 dark:text-white"><Globe2 className="text-indigo-500" size={28}/> Empirical Data Log</h2>
               <button onClick={() => fetchLatestNews('science', true).then(setCachedNews)} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"><RefreshCw size={24}/></button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto pb-10">
               {cachedNews.map((n, i) => (
                 <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border dark:border-slate-800 overflow-hidden flex flex-col hover:-translate-y-2 transition-all">
                   <img src={n.image} className="h-48 w-full object-cover"/>
                   <div className="p-6 flex-1 flex flex-col">
                     <h3 className="font-bold text-sm mb-3 font-mono line-clamp-2 leading-relaxed dark:text-white">{n.title}</h3>
                     <p className="text-[11px] text-slate-500 mb-6 line-clamp-3 leading-relaxed flex-1">{n.description}</p>
                     <div className="mt-auto pt-5 border-t dark:border-slate-800 flex justify-between items-center text-[10px] font-mono">
                       <span className="text-slate-400 uppercase">{n.source}</span>
                       <a href={n.url} target="_blank" className="text-indigo-500 font-bold uppercase hover:underline">Full Report</a>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           </div>
        )}
        
        {activePage === 'about' && (
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-black font-mono">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border dark:border-slate-800 shadow-2xl text-center">
               <Cpu size={56} className="mx-auto mb-8 text-indigo-500 animate-pulse"/>
               <h2 className="text-2xl font-bold mb-3 uppercase tracking-tighter dark:text-white">Serenity Intelligence</h2>
               <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em] mb-10">Advanced Production Hub v10.03.07</p>
               <div className="text-left space-y-5 text-[11px] leading-relaxed">
                  <div className="p-5 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border dark:border-indigo-900/40">
                    <span className="font-bold text-indigo-500 block mb-2 uppercase tracking-widest text-[9px]">Neural Architecture</span> 
                    Synthesizing high-fidelity analysis via Gemini 3.0 logical processing.
                  </div>
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-700">
                    <span className="font-bold text-slate-500 block mb-2 uppercase tracking-widest text-[9px]">Persistence Protocol</span> 
                    Immutable IndexedDB archiving for multidimensional scientific data logs.
                  </div>
               </div>
               <div className="mt-12 pt-8 border-t dark:border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Lead Architect: Anshuman Singh</p>
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
