
import { GoogleGenAI, Type } from "@google/genai";
import { Message, IntentionResponse, NewsArticle } from '../types';

// The API key is injected by Vite from Render's environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const SYSTEM_CORE = `
[PROMPT_ENGINE_V10.03.07]
IDENTITY: Serenity AI.
ROLE: Advanced Scientific and Logical Assistant.
BEHAVIOR: Objective, precise, technical, and analytical.
INSTRUCTIONS: Provide structured reasoning using ### headers and **bold** text. Show logical chain if deep analysis is active.
`;

export const classifyUserIntention = async (userInput: string): Promise<IntentionResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Classify query intent: "${userInput}"` }] }],
      config: {
        systemInstruction: 'Output JSON: {"type": "chat"|"generate_image"|"fetch_news", "query": "refined scientific prompt"}',
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            query: { type: Type.STRING }
          },
          required: ['type', 'query']
        }
      }
    });
    
    return JSON.parse(response.text || '{"type":"chat", "query":""}');
  } catch (error) {
    return { type: 'chat', query: userInput };
  }
};

export const generateOpenRouterResponse = async (
  history: Message[],
  systemPrompt: string,
  deepAnalysis: boolean = false
): Promise<{content: string, thought?: string}> => {
  try {
    const contents = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Initiate system.' }] });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: contents,
      config: {
        systemInstruction: `${SYSTEM_CORE}\n${systemPrompt}`,
        maxOutputTokens: deepAnalysis ? 20000 : 4000,
        thinkingConfig: deepAnalysis ? { thinkingBudget: 18000 } : undefined
      }
    });

    const fullOutput = response.text || "";
    
    if (deepAnalysis && fullOutput.includes('\n\n')) {
      const parts = fullOutput.split('\n\n');
      const thought = parts[0];
      const actualContent = parts.slice(1).join('\n\n');
      return actualContent.trim() ? { thought, content: actualContent } : { content: fullOutput };
    }

    return { content: fullOutput };
  } catch (error) {
    console.error("AI Fault:", error);
    return { content: "System connection interrupted. Please check API configuration." };
  }
};

export const summarizeNewsForChat = async (news: NewsArticle[], originalQuery: string, systemPersona: string): Promise<string> => {
  if (!news.length) return "No empirical news data found.";
  const newsContext = news.slice(0, 5).map(n => `### ${n.title}\n${n.description}`).join('\n\n');
  const prompt = `Synthesize report for "${originalQuery}" based on:\n\n${newsContext}`;
  const res = await generateOpenRouterResponse([{id: 'i', role: 'user', content: prompt, timestamp: Date.now()}], systemPersona);
  return res.content;
};

export const generateChatTitle = async (history: Message[]): Promise<string> => {
  try {
    const firstMsg = history.find(m => m.role === 'user')?.content || "Session";
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Title (3 words) for: "${firstMsg}"` }] }],
      config: { maxOutputTokens: 10 }
    });
    return response.text?.trim() || "Technical Log";
  } catch { return "New Analysis"; }
};
