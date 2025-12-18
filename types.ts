

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  image?: string; 
  imageId?: string; 
  newsArticles?: NewsArticle[];
  thoughtProcess?: string; // New: For logical reasoning steps
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface ImageHistoryItem {
  id: string;
  url: string; 
  prompt: string;
  createdAt: number;
}

export interface AppSettings {
  userName: string;
  partnerName: string;
  systemPrompt: string;
  customMemories: string;
  themeId: 'romantic' | 'ocean' | 'nature' | 'sunset' | 'midnight';
  fontFamily: 'Quicksand' | 'Inter' | 'Playfair Display' | 'Fira Code';
  newsRefreshInterval: number; 
  deepAnalysisMode: boolean; // New interactive scientific toggle
  keyOpenRouter?: string; // Added to resolve TypeScript index error in services/config.ts
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  image: string;
  source: string;
  publishedAt: string;
  id?: string;
}

export type PageView = 'chat' | 'gallery' | 'news' | 'about';

export type UserIntention = 'chat' | 'generate_image' | 'fetch_news';

export interface IntentionResponse {
  type: UserIntention;
  query: string;
}