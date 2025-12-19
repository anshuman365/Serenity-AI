export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  image?: string;
  imageId?: string;
  newsArticles?: NewsArticle[];
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
  userName: string;           // AI Assistant Name
  partnerName: string;        // User Name
  systemPrompt: string;       // AI Personality/Instructions
  customMemories: string;     // User preferences/context
  themeId: 'romantic' | 'ocean' | 'nature' | 'sunset' | 'midnight';
  fontFamily: 'Quicksand' | 'Inter' | 'Playfair Display' | 'Fira Code';
  newsRefreshInterval: number;
  keyOpenRouter?: string;
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  image: string;
  source: string;
  publishedAt: string;
}

export type PageView = 'chat' | 'gallery' | 'news' | 'about';

export type UserIntention = 'chat' | 'generate_image' | 'fetch_news';

export interface IntentionResponse {
  type: UserIntention;
  query: string;
}