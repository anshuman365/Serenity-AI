
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  imageId?: string;
  newsArticles?: NewsArticle[];
  groundingSources?: { title: string; url: string }[];
  metadata?: {
    imageGeneration?: {
      originalPrompt: string;
      refinedPrompt: string;
    };
  };
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
  refinedPrompt?: string;
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

export type UserIntention = 'chat' | 'generate_image' | 'fetch_news' | 'web_search';

export interface IntentionResponse {
  type: UserIntention;
  query: string;
}
