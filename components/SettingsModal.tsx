import React, { useState } from 'react';
import { AppSettings } from '../types';
import { X, Save, User, Sparkles, Palette, Key, Type, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'profile' | 'persona' | 'appearance' | 'keys'>('profile');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const themes = [
    { id: 'ocean', name: 'Ocean Blue', color: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
    { id: 'nature', name: 'Forest Green', color: 'bg-gradient-to-r from-emerald-500 to-teal-600' },
    { id: 'midnight', name: 'Midnight', color: 'bg-gradient-to-r from-gray-700 to-gray-900' },
    { id: 'sunset', name: 'Sunset Orange', color: 'bg-gradient-to-r from-orange-500 to-red-500' },
    { id: 'romantic', name: 'Romantic Pink', color: 'bg-gradient-to-r from-pink-500 to-purple-500' },
  ];

  const fonts = [
    { id: 'Inter', name: 'Inter (Clean)' },
    { id: 'Quicksand', name: 'Quicksand (Rounded)' },
    { id: 'Fira Code', name: 'Fira Code (Technical)' },
    { id: 'Playfair Display', name: 'Playfair (Elegant)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-gray-900 flex flex-col max-h-[90vh] border border-gray-100 dark:border-gray-800">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              Settings
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Customize your AI assistant</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Layout: Sidebar Tabs */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* Tabs */}
          <div className="flex md:flex-col border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900 md:w-48 shrink-0 overflow-x-auto md:overflow-visible">
            {[
              { id: 'profile', icon: User, label: 'Profile' },
              { id: 'persona', icon: Sparkles, label: 'AI Personality' },
              { id: 'appearance', icon: Palette, label: 'Appearance' },
              { id: 'keys', icon: Key, label: 'API Keys' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-6 py-4 text-sm font-medium transition-all relative whitespace-nowrap
                  ${activeTab === tab.id 
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
              >
                <tab.icon size={18} className={activeTab === tab.id ? 'stroke-2' : 'stroke-[1.5]'} /> 
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 md:h-full md:w-1 md:right-auto md:left-0 bg-blue-600 dark:bg-blue-500" />
                )}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white dark:bg-gray-900">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">User Profile</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Your Name</label>
                      <input
                        type="text"
                        value={localSettings.partnerName}
                        onChange={(e) => setLocalSettings({...localSettings, partnerName: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                        placeholder="What should I call you?"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">AI Assistant Name</label>
                      <input
                        type="text"
                        value={localSettings.userName}
                        onChange={(e) => setLocalSettings({...localSettings, userName: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                        placeholder="Name your AI assistant"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Preferences & Context</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Information that helps me understand your preferences better.</p>
                  <textarea
                    rows={4}
                    value={localSettings.customMemories}
                    onChange={(e) => setLocalSettings({...localSettings, customMemories: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none dark:text-white text-sm"
                    placeholder="E.g., I'm a developer, interested in machine learning, prefer detailed explanations..."
                  />
                </div>
              </div>
            )}

            {/* PERSONA TAB - Updated for professional AI */}
            {activeTab === 'persona' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div>
                   <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">AI Personality & Behavior</h3>
                   <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                     Define how the AI assistant should communicate and respond.
                   </p>
                   <div className="relative">
                    <textarea
                      rows={12}
                      value={localSettings.systemPrompt}
                      onChange={(e) => setLocalSettings({...localSettings, systemPrompt: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none font-mono text-xs leading-relaxed dark:text-gray-300"
                      placeholder="You are Serenity AI, a sophisticated assistant..."
                    />
                    <div className="absolute bottom-3 right-3 text-[10px] text-gray-400 pointer-events-none">
                      SYSTEM PROMPT
                    </div>
                   </div>
                   <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                     <p className="text-xs text-blue-700 dark:text-blue-300">
                       <strong>Default:</strong> Professional, knowledgeable, clear communication. Adapts technical depth based on query.
                     </p>
                   </div>
                </div>
              </div>
            )}

            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Color Theme</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {themes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setLocalSettings({...localSettings, themeId: t.id as any})}
                        className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all ${
                          localSettings.themeId === t.id 
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-blue-600/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${t.color} shadow-sm group-hover:scale-105 transition-transform`}></div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t.name}</span>
                        </div>
                        {localSettings.themeId === t.id && <Check size={18} className="text-blue-600 dark:text-blue-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                   <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Typography</h3>
                   <div className="grid grid-cols-1 gap-2">
                    {fonts.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setLocalSettings({...localSettings, fontFamily: f.id as any})}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                          localSettings.fontFamily === f.id 
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <span className="text-gray-800 dark:text-gray-200" style={{ fontFamily: f.id }}>{f.name}</span>
                        {localSettings.fontFamily === f.id && <Check size={16} className="text-blue-600 dark:text-blue-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* API KEYS TAB */}
            {activeTab === 'keys' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-lg p-4 flex gap-3">
                  <div className="mt-0.5 text-orange-500 dark:text-orange-400">
                    <Key size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-300">API Configuration</h4>
                    <p className="text-xs text-orange-700 dark:text-orange-400 mt-1 leading-relaxed">
                      Required for full functionality. Keys are stored locally on your device.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">OpenRouter API Key</label>
                  <input
                    type="password"
                    value={localSettings.keyOpenRouter || ''}
                    onChange={(e) => setLocalSettings({...localSettings, keyOpenRouter: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-sm dark:text-white"
                    placeholder="sk-or-v1-..."
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Required for AI chat functionality.</p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:px-8 md:py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;