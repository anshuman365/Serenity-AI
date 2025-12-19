
import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

export interface SearchResult {
  text: string;
  sources: { title: string; url: string }[];
}

export const performWebSearch = async (query: string, history: Message[]): Promise<SearchResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Format history for Gemini
  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  // Add the current search query
  contents.push({
    role: 'user',
    parts: [{ text: `Search for the latest information about: ${query}. Provide a detailed and accurate answer based on current web results.` }]
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: contents,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text || "I found some information, but couldn't synthesize it properly.";
  
  // Extract grounding metadata for citations
  const sources: { title: string; url: string }[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  
  if (chunks) {
    chunks.forEach((chunk: any) => {
      if (chunk.web && chunk.web.uri && chunk.web.title) {
        // Prevent duplicates
        if (!sources.find(s => s.url === chunk.web.uri)) {
          sources.push({
            title: chunk.web.title,
            url: chunk.web.uri
          });
        }
      }
    });
  }

  return { text, sources };
};
