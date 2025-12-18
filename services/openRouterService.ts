
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Message, IntentionResponse, NewsArticle } from '../types';

// Gemini API initialization using the mandatory environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_CORE = `
[PROMPT_ENGINE_V10.03.07]
IDENTITY: Serenity AI.
ROLE: Advanced Scientific and Logical Assistant.
BEHAVIOR: Objective, precise, technical, and analytical.
INSTRUCTIONS: Use empirical data, provide structured reasoning using ### headers and **bold** text.
Maintain a high-fidelity professional tone. If deep analysis is on, show your logical chain.
`;

export const classifyUserIntention = async (userInput: string): Promise<IntentionResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Classify query intent for scientific processing: "${userInput}"` }] }],
      config: {
        systemInstruction: 'Output JSON only: {"type": "chat"|"generate_image"|"fetch_news", "query": "refined scientific prompt"}',
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
    // Ensuring alternating user/model pattern and non-empty contents
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
        maxOutputTokens: deepAnalysis ? 20000 : 3500,
        thinkingConfig: deepAnalysis ? { thinkingBudget: 18000 } : undefined
      }
    });

    const fullOutput = response.text || "Diagnostic error: No logical output generated.";
    
    // Separation of reasoning chain for deep analysis mode
    if (deepAnalysis && fullOutput.includes('\n\n')) {
      const parts = fullOutput.split('\n\n');
      const thought = parts[0];
      const actualContent = parts.slice(1).join('\n\n');
      
      if (actualContent.trim().length > 0) {
        return { thought, content: actualContent };
      }
    }

    return { content: fullOutput };
  } catch (error) {
    console.error("Gemini Production Error:", error);
    throw error;
  }
};

export const summarizeNewsForChat = async (news: NewsArticle[], originalQuery: string, systemPersona: string): Promise<string> => {
  if (!news.length) return "No empirical data available in news archives.";
  const newsContext = news.slice(0, 5).map(n => `### ${n.title}\n**Summary:** ${n.description}`).join('\n\n');
  const prompt = `Synthesize scientific report for "${originalQuery}" based on these datasets:\n\n${newsContext}`;
  const res = await generateOpenRouterResponse([{id: 'init', role: 'user', content: prompt, timestamp: Date.now()}], systemPersona);
  return res.content;
};

export const generateChatTitle = async (history: Message[]): Promise<string> => {
  try {
    const firstMsg = history.find(m => m.role === 'user')?.content || "Session";
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Concise scientific title (3-4 words) for: "${firstMsg}"` }] }],
      config: { maxOutputTokens: 20 }
    });
    return response.text?.replace(/["']/g, '').trim() || "Technical Log";
  } catch { return "New Analysis"; }
};
