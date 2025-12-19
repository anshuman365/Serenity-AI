
/**
 * Native Web Speech API Service
 * Robust implementation for free, zero-latency TTS.
 */

let currentUtterance: SpeechSynthesisUtterance | null = null;

const getBestVoice = () => {
  const voices = window.speechSynthesis.getVoices();
  const preferred = [
    'Google US English',
    'Google UK English Female',
    'Microsoft Aria Online',
    'Microsoft Jenny Online',
    'Apple Samantha',
    'en-US'
  ];

  for (const name of preferred) {
    const found = voices.find(v => v.name.includes(name) || v.lang === name);
    if (found) return found;
  }
  return voices.find(v => v.lang.startsWith('en')) || voices[0];
};

export const speakText = async (text: string): Promise<void> => {
  return new Promise((resolve) => {
    // Standard SpeechSynthesis sometimes hangs in Chrome. 
    // This resume hack ensures the queue keeps moving.
    const resumeInfinity = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 5000);

    window.speechSynthesis.cancel();

    // Clean text for cleaner speech
    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '') 
      .replace(/```[\s\S]*?```/g, 'Code block skipped') // Don't read raw code
      .substring(0, 1000);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = getBestVoice();
    if (voice) utterance.voice = voice;
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      clearInterval(resumeInfinity);
      currentUtterance = null;
      resolve();
    };

    utterance.onerror = (e) => {
      console.error('Speech Error:', e);
      clearInterval(resumeInfinity);
      currentUtterance = null;
      resolve();
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    
    // Safety timeout
    setTimeout(() => {
      clearInterval(resumeInfinity);
      resolve();
    }, 30000);
  });
};

export const stopSpeech = () => {
  window.speechSynthesis.cancel();
  currentUtterance = null;
};

// Warm up the API
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }
}
