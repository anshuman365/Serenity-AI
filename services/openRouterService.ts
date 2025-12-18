
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Message, IntentionResponse, NewsArticle } from '../types';

// Gemini API initialized exclusively from environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_CORE = `
[PROMPT_ENGINE_V10.03.07]
IDENTITY: Serenity AI.
ROLE: Advanced Scientific and Logical Assistant.
BEHAVIOR: Objective, precise, technical, and analytical.
INSTRUCTIONS: Use empirical data, provide structured reasoning using ### headers and **bold** text. Maintain a high-fidelity professional tone.
`;

export const classifyUserIntention = async (userInput: string): Promise<IntentionResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Classify query intent and refine for a scientific agent: "${userInput}"` }] }],
      config: {
        systemInstruction: 'Output strictly JSON: {"type": "chat"|"generate_image"|"fetch_news", "query": "refined scientific prompt"}',
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
    // CRITICAL: Ensure contents array is never empty and follows user/model alternating pattern
    const contents = history.length > 0 
      ? history.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }))
      : [{ role: 'user', parts: [{ text: 'Initiate core system analysis.' }] }];

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: contents,
      config: {
        systemInstruction: `${SYSTEM_CORE}\n${systemPrompt}`,
        maxOutputTokens: deepAnalysis ? 18000 : 3000,
        thinkingConfig: deepAnalysis ? { thinkingBudget: 16000 } : undefined
      }
    });

    const text = response.text || "Diagnostic error: No logical output generated.";
    
    // Improved thinking block extraction
    if (deepAnalysis && text.includes('\n\n')) {
      const parts = text.split('\n\n');
      const thoughtPart = parts[0];
      const contentPart = parts.slice(1).join('\n\n');
      if (contentPart.trim().length > 0) {
        return { thought: thoughtPart, content: contentPart };
      }
    }

    return { content: text };
  } catch (error) {
    console.error("Gemini Analytical Fault:", error);
    throw error;
  }
};

export const summarizeNewsForChat = async (news: NewsArticle[], originalQuery: string, systemPersona: string): Promise<string> => {
  if (!news.length) return "No empirical news data found in archives for this sector.";
  const newsContext = news.slice(0, 6).map(n => `### ${n.title}\n**Source:** ${n.source}\n**Summary:** ${n.description}`).join('\n\n');
  const prompt = `Synthesize technical analysis for query "${originalQuery}" using these datasets:\n\n${newsContext}`;
  const res = await generateOpenRouterResponse([{id: 'init', role: 'user', content: prompt, timestamp: Date.now()}], systemPersona);
  return res.content;
};

export const generateChatTitle = async (history: Message[]): Promise<string> => {
  try {
    const firstUserMsg = history.find(m => m.role === 'user')?.content || "Session";
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Provide a 3-word technical title for this topic: "${firstUserMsg}"` }] }],
      config: { maxOutputTokens: 20 }
    });
    return response.text?.replace(/["']/g, '').trim() || "Technical Log";
  } catch { return "New Analysis"; }
};
