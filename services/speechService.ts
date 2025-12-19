
/**
 * Native Web Speech API Service
 * Provides free, zero-latency TTS using system-level neural voices.
 */

let currentUtterance: SpeechSynthesisUtterance | null = null;

// Helper to find the best available voice on the user's system
const getBestVoice = () => {
  const voices = window.speechSynthesis.getVoices();
  
  // Preference list for high-quality natural voices
  const preferred = [
    'Google US English',
    'Google UK English Female',
    'Microsoft Aria Online',
    'Microsoft Jenny Online',
    'Apple Samantha',
    'en-US',
    'en-GB'
  ];

  for (const name of preferred) {
    const found = voices.find(v => v.name.includes(name) || v.lang === name);
    if (found) return found;
  }

  return voices.find(v => v.lang.startsWith('en')) || voices[0];
};

export const speakText = async (text: string): Promise<void> => {
  return new Promise((resolve) => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Remove markdown symbols and clean text for cleaner speech
    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '') // Remove links
      .substring(0, 1000); // Sanity limit for long responses

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Configure voice
    const voice = getBestVoice();
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
      currentUtterance = null;
      resolve();
    };

    utterance.onerror = (event) => {
      console.error('Speech Synthesis Error:', event);
      currentUtterance = null;
      resolve();
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    
    // Fallback resolve if the API hangs (happens in some mobile browsers)
    setTimeout(resolve, 15000);
  });
};

export const stopSpeech = () => {
  window.speechSynthesis.cancel();
  currentUtterance = null;
};

// Pre-load voices (browsers load them asynchronously)
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }
}
