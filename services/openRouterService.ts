import { Message, IntentionResponse, NewsArticle } from '../types';
import { CONFIG, fetchBackendKeys } from './config';

const getHeaders = () => ({
  "Authorization": `Bearer ${CONFIG.OPENROUTER_API}`,
  "Content-Type": "application/json",
  "HTTP-Referer": window.location.origin,
  "X-Title": "Serenity AI Assistant",
});

// Updated: Professional AI Profile
const AI_PROFILE = `
[SYSTEM_DATA: AI_PROFILE]
Name: Serenity AI
Identity: Advanced AI Assistant with expertise in technology, science, research, and creative problem-solving.
Capabilities: Expert in Python, AI/ML concepts, web development (React, TypeScript, Node.js), data analysis, and technical writing.
Communication Style: Clear, concise, professional. Provides accurate, well-researched information. Maintains helpful and respectful tone.
Goal: To assist users with information, creative tasks, technical guidance, and intelligent conversation.
Creator: Anshuman Singh (Physicist & Developer)
Instruction: Respond in clear, professional English. Be precise, knowledgeable, and helpful.
`;

// 1. Classify User Intention (unchanged, but we can keep it)
export const classifyUserIntention = async (userInput: string): Promise<IntentionResponse> => {
  if (!CONFIG.OPENROUTER_API) {
    await fetchBackendKeys();
  }

  if (!CONFIG.OPENROUTER_API) {
    console.error("OpenRouter Key is missing in config");
    return { type: 'chat', query: userInput }; 
  }

  const systemInstruction = `
    You are an intention classifier. Analyze the input and return a JSON object.
    
    Categories:
    1. 'generate_image': User wants to create/draw/see an image.
    2. 'fetch_news': User asks for news, headlines, updates, current events.
    3. 'chat': Normal conversation, advice, technical questions, or general inquiries.

    Response Format (JSON ONLY):
    {
      "type": "chat" | "generate_image" | "fetch_news",
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

    if (!response.ok) {
      throw new Error(`OpenRouter Classifier Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    try {
        const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        return { type: 'chat', query: userInput };
    }
  } catch (error) {
    console.warn("Classification failed, defaulting to chat", error);
    return { type: 'chat', query: userInput };
  }
};

// 2. Main Chat Generation - Updated for professional AI
export const generateOpenRouterResponse = async (
  history: Message[],
  systemPrompt: string
): Promise<string> => {
  
  if (!CONFIG.OPENROUTER_API) {
    await fetchBackendKeys();
  }
  
  if (!CONFIG.OPENROUTER_API) {
    throw new Error("API Key missing. Please add it in Settings.");
  }

  const MODEL = "google/gemini-2.0-flash-001"; 

  // Merge User's settings with AI Profile
  const finalSystemPrompt = `
    ${systemPrompt}
    
    ${AI_PROFILE}
    
    GUIDELINES:
    - Be precise, knowledgeable, and professional
    - Provide well-structured responses
    - Admit when you don't know something
    - Use clear English with appropriate technical depth
    - Be helpful and respectful
    - For technical topics, explain concepts clearly
  `;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        model: MODEL, 
        max_tokens: 550,
        messages: [
          { role: "system", content: finalSystemPrompt },
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
    return data.choices?.[0]?.message?.content || "I apologize, I didn't understand that. Could you rephrase?";
  } catch (error) {
    console.error("OpenRouter Error:", error);
    throw error;
  }
};

// 3. Summarize News - Updated for professional tone
export const summarizeNewsForChat = async (news: NewsArticle[], originalQuery: string, systemPersona: string): Promise<string> => {
  if (!news.length) return "I couldn't find recent news on that topic. Would you like me to search for something else?";

  const newsContext = news.slice(0, 5).map(n => `
    Title: ${n.title}
    Source: ${n.source}
    Snippet: ${n.description}
    Date: ${n.publishedAt}
  `).join('\n---\n');
  
  const prompt = `
    Current Date: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    ${systemPersona}
    
    CONTEXT:
    The user asked about: "${originalQuery}".
    I've performed a news search and found these articles:
    
    ${newsContext}

    TASK:
    Provide a concise, professional summary of these news articles.
    Organize information clearly, mention key sources and dates.
    Maintain a neutral, informative tone.
    Focus on factual reporting rather than opinion.
  `;

  return generateOpenRouterResponse([], prompt);
};

// 4. Generate Chat Title (unchanged, but prompt updated)
export const generateChatTitle = async (history: Message[]): Promise<string> => {
  if (!CONFIG.OPENROUTER_API) return "";

  const contextMessages = history.slice(0, 4).map(m => `${m.role}: ${m.content}`).join('\n');
  
  const systemInstruction = `
    Analyze the conversation snippet and create a short, descriptive title (max 4 words).
    Make it professional and reflective of the main topic.
    Examples: "Quantum Physics Discussion", "Image Generation Request", "News Analysis", "Technical Support".
    Do NOT use quotation marks.
    Return ONLY the title text.
  `;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo", 
        max_tokens: 15,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: contextMessages }
        ]
      })
    });

    if (!response.ok) return "";
    
    const data = await response.json();
    let title = data.choices?.[0]?.message?.content?.trim();
    if (title) {
        title = title.replace(/^["']|["']$/g, '');
        return title;
    }
    return "";
  } catch (error) {
    console.warn("Title generation failed", error);
    return "";
  }
};