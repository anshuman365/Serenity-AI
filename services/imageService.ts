// Using Pollinations.ai for backend-free, key-free image generation
// This avoids CORS issues and API key complexity for the user.

export const generateImageHF = async (prompt: string): Promise<Blob> => {
  try {
    const encodedPrompt = encodeURIComponent(prompt);
    // Pollinations AI URL structure: https://image.pollinations.ai/prompt/{prompt}
    // We add a random seed to ensure new images are generated for the same prompt
    const seed = Math.floor(Math.random() * 10000);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error("Failed to fetch image from Pollinations");
    }

    return await response.blob();
  } catch (error) {
    console.error("Image Gen Error:", error);
    throw new Error("Could not generate image. Please try again.");
  }
};