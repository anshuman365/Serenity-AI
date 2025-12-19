
import { Message, IntentionResponse, NewsArticle } from '../types';
import { CONFIG, fetchBackendKeys } from './config';

const getHeaders = () => ({
  "Authorization": `Bearer ${CONFIG.OPENROUTER_API}`,
  "Content-Type": "application/json",
  "HTTP-Referer": window.location.origin,
  "X-Title": "Serenity AI Assistant",
});

const AI_PROFILE = `
[SYSTEM_DATA: AI_PROFILE]
Name: Serenity AI
Identity: Advanced AI Assistant with expertise in technology, science, research, and creative problem-solving.
Capabilities: Expert in Python, AI/ML concepts, web development (React, TypeScript, Node.js), data analysis, and technical writing.
Creator: Anshuman Singh (Physicist & Developer)
`;

export const classifyUserIntention = async (userInput: string): Promise<IntentionResponse> => {
  if (!CONFIG.OPENROUTER_API) {
    await fetchBackendKeys();
  }

  if (!CONFIG.OPENROUTER_API) {
    return { type: 'chat', query: userInput }; 
  }

  const systemInstruction = `
    Analyze user input and classify it into one of these categories:
    1. 'generate_image': User wants to create/draw/see an image.
    2. 'fetch_news': User asks for general news/headlines/daily updates.
    3. 'web_search': User asks for SPECIFIC facts, recent events, real-time data, people, or details that require a fresh internet search (e.g., "Who won the game last night?", "Latest Nobel prize winners", "Price of Bitcoin").
    4. 'chat': General talk, coding, math, greeting, or advice.

    Response Format (JSON ONLY):
    {
      "type": "chat" | "generate_image" | "fetch_news" | "web_search",
      "query": "refined search query or prompt"
    }
  `;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo", 
        max_tokens: 64,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userInput }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) throw new Error(`OpenRouter Classifier Error: ${response.status}`);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    try {
        const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        return { type: 'chat', query: userInput };
    }
  } catch (error) {
    return { type: 'chat', query: userInput };
  }
};

export const generateOpenRouterResponse = async (
  history: Message[],
  systemPrompt: string
): Promise<string> => {
  if (!CONFIG.OPENROUTER_API) await fetchBackendKeys();
  if (!CONFIG.OPENROUTER_API) throw new Error("API Key missing.");

  const MODEL = "google/gemini-2.0-flash-001"; 

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        model: MODEL, 
        max_tokens: 550,
        messages: [
          { role: "system", content: systemPrompt + "\n" + AI_PROFILE },
          ...history.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "I apologize, I didn't understand that.";
  } catch (error) {
    console.error("OpenRouter Error:", error);
    throw error;
  }
};

export const summarizeNewsForChat = async (news: NewsArticle[], originalQuery: string, systemPersona: string): Promise<string> => {
  if (!news.length) return "I couldn't find recent news on that topic.";

  const newsContext = news.slice(0, 5).map(n => `Title: ${n.title}\nSource: ${n.source}\nSnippet: ${n.description}`).join('\n---\n');
  
  const prompt = `
    ${systemPersona}
    CONTEXT: News search for "${originalQuery}".
    NEWS:
    ${newsContext}
    TASK: Summarize these news articles concisely.
  `;

  return generateOpenRouterResponse([], prompt);
};

export const generateChatTitle = async (history: Message[]): Promise<string> => {
  if (!CONFIG.OPENROUTER_API) return "";
  const contextMessages = history.slice(0, 4).map(m => `${m.role}: ${m.content}`).join('\n');
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo", 
        max_tokens: 15,
        messages: [
          { role: "system", content: "Create a short 3-4 word title for this chat. No quotes." },
          { role: "user", content: contextMessages }
        ]
      })
    });
    if (!response.ok) return "";
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  } catch (error) {
    return "";
  }
};
