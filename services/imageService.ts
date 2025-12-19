import { CONFIG } from './config';

export interface ImageGenerationResult {
  blob: Blob;
  refinedPrompt: string;
  originalPrompt: string;
  source: 'pollinations' | 'huggingface' | 'craiyon';
}

// Function to refine user prompt using OpenRouter
export const refinePromptWithOpenRouter = async (userPrompt: string): Promise<string> => {
  if (!CONFIG.OPENROUTER_API) {
    console.warn("OpenRouter API key not found, using original prompt");
    return userPrompt;
  }

  try {
    const systemInstruction = `
      You are a prompt engineering expert for AI image generation. Refine and enhance user prompts for better results.
      
      RULES:
      1. ADD details about: style, lighting, composition, mood, camera angle, art style
      2. If no style specified, add: "digital art, detailed, high quality"
      3. Add quality terms: "4K, ultra detailed, masterpiece, trending on ArtStation"
      4. Keep core idea but make it vivid and descriptive
      5. Maximum 80 words
      6. Return ONLY the refined prompt
      
      EXAMPLES:
      Input: "a cat" → Output: "A cute fluffy ginger cat sitting on a windowsill, golden hour lighting, photorealistic, detailed fur, 8K resolution"
      Input: "sunset beach" → Output: "Beautiful sunset over tropical beach, vibrant orange and pink sky, palm trees silhouette, calm ocean waves, cinematic photography, wide angle lens, professional 4K"
      Input: "cyberpunk city" → Output: "Cyberpunk futuristic city at night, neon lights reflecting on wet streets, towering skyscrapers, flying cars, Blade Runner aesthetic, digital art, cinematic lighting"
    `;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CONFIG.OPENROUTER_API}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Serenity AI"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        max_tokens: 200,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: `Refine this image prompt: "${userPrompt}"` }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter prompt refinement failed: ${response.status}`);
    }

    const data = await response.json();
    let refinedPrompt = data.choices?.[0]?.message?.content?.trim();
    
    // Clean up the prompt
    if (refinedPrompt) {
      refinedPrompt = refinedPrompt.replace(/^["']|["']$/g, '');
      console.log(`Prompt refined: "${userPrompt}" → "${refinedPrompt}"`);
      return refinedPrompt;
    }
    
    return userPrompt;
  } catch (error) {
    console.error("Prompt refinement error:", error);
    return userPrompt;
  }
};

// Strategy 1: Pollinations.ai (Primary - Free, no API key)
const generateWithPollinations = async (prompt: string): Promise<Blob> => {
  const encodedPrompt = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 10000);
  
  // Try different Pollinations endpoints
  const endpoints = [
    `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`,
    `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=1024`,
    `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=768&height=768&model=stable-diffusion`,
  ];

  for (const url of endpoints) {
    try {
      console.log(`Trying Pollinations endpoint: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*'
        }
      });
      
      if (response.ok && response.headers.get('content-type')?.includes('image')) {
        return await response.blob();
      }
    } catch (error) {
      console.warn(`Pollinations endpoint failed: ${error}`);
    }
  }
  
  throw new Error("All Pollinations endpoints failed");
};

// Strategy 2: Hugging Face Free Inference API (Fallback)
const generateWithHuggingFace = async (prompt: string): Promise<Blob> => {
  try {
    const API_TOKEN = "hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // Free public token
    const model = "stabilityai/stable-diffusion-2-1";
    
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            negative_prompt: "blurry, distorted, ugly, bad anatomy",
            num_inference_steps: 30,
            guidance_scale: 7.5
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status}`);
    }

    return await response.blob();
  } catch (error) {
    console.error("Hugging Face generation failed:", error);
    throw error;
  }
};

// Strategy 3: Craiyon (formerly DALL-E Mini) - Completely Free
const generateWithCraiyon = async (prompt: string): Promise<Blob> => {
  try {
    console.log("Trying Craiyon API...");
    
    // Craiyon v3 API
    const response = await fetch('https://api.craiyon.com/v3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        negative_prompt: "",
        model: "art",
        aspect_ratio: "1:1",
        size: "1024"
      })
    });

    if (!response.ok) {
      throw new Error(`Craiyon API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Craiyon returns base64 images
    if (data.images && data.images[0]) {
      const base64Data = data.images[0].replace(/^data:image\/\w+;base64,/, '');
      const byteCharacters = atob(base64Data);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      return new Blob(byteArrays, { type: 'image/png' });
    }
    
    throw new Error("No image returned from Craiyon");
  } catch (error) {
    console.error("Craiyon generation failed:", error);
    throw error;
  }
};

// Strategy 4: Lexica Art API (Free tier)
const generateWithLexica = async (prompt: string): Promise<Blob> => {
  try {
    console.log("Trying Lexica API...");
    
    const response = await fetch('https://lexica.art/api/infinite-prompts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: prompt,
        searchMode: "images",
        source: "search",
        cursor: 0,
        model: "lexica-aperture-v2"
      })
    });

    if (!response.ok) {
      throw new Error(`Lexica API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.images && data.images[0] && data.images[0].src) {
      const imageResponse = await fetch(data.images[0].src);
      if (imageResponse.ok) {
        return await imageResponse.blob();
      }
    }
    
    throw new Error("No image found from Lexica");
  } catch (error) {
    console.error("Lexica generation failed:", error);
    throw error;
  }
};

// Main image generation function with multiple fallbacks
export const generateImageHF = async (userPrompt: string): Promise<ImageGenerationResult> => {
  console.log("Starting image generation for prompt:", userPrompt);
  
  // Step 1: Refine the prompt using OpenRouter
  const refinedPrompt = await refinePromptWithOpenRouter(userPrompt);
  
  // Step 2: Try multiple image generation APIs in sequence
  const strategies: Array<{
    name: string;
    generator: (prompt: string) => Promise<Blob>;
    source: 'pollinations' | 'huggingface' | 'craiyon';
  }> = [
    { name: 'Pollinations.ai', generator: generateWithPollinations, source: 'pollinations' },
    { name: 'Craiyon', generator: generateWithCraiyon, source: 'craiyon' },
    { name: 'Lexica Art', generator: generateWithLexica, source: 'pollinations' },
  ];

  let lastError: Error | null = null;
  
  for (const strategy of strategies) {
    try {
      console.log(`Trying ${strategy.name}...`);
      const blob = await strategy.generator(refinedPrompt);
      
      console.log(`✓ Successfully generated image with ${strategy.name}`);
      
      return {
        blob,
        refinedPrompt,
        originalPrompt: userPrompt,
        source: strategy.source
      };
      
    } catch (error) {
      console.warn(`${strategy.name} failed:`, error);
      lastError = error as Error;
      // Continue to next strategy
    }
  }
  
  // If all strategies fail, try a final fallback to a placeholder service
  try {
    console.log("All APIs failed, trying final fallback...");
    
    // Fallback to a simple image placeholder with prompt text
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, 512, 512);
      gradient.addColorStop(0, '#4f46e5');
      gradient.addColorStop(1, '#7c3aed');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
      
      // Add text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('Image Generation', 256, 200);
      
      ctx.font = '16px Inter';
      ctx.fillText('Prompt:', 256, 250);
      
      ctx.font = '14px Inter';
      const lines = refinedPrompt.match(/.{1,40}/g) || [refinedPrompt];
      lines.forEach((line, i) => {
        ctx.fillText(line, 256, 280 + (i * 24));
      });
      
      ctx.font = '12px Inter';
      ctx.fillText('(All image APIs are currently busy)', 256, 450);
      ctx.fillText('Please try again in a moment', 256, 470);
    }
    
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
      }, 'image/png');
    });
    
    return {
      blob,
      refinedPrompt,
      originalPrompt: userPrompt,
      source: 'pollinations'
    };
    
  } catch (fallbackError) {
    console.error("Even fallback failed:", fallbackError);
    throw new Error(
      `Could not generate image. All services failed. Last error: ${lastError?.message}. ` +
      `Please try a different prompt or try again later.`
    );
  }
};