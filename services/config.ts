import { AppSettings } from '../types';

// Store backend key in memory
let backendOpenRouterKey = '';

// Helper to safely access environment variables
const getEnv = (key: string): string => {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[key]) {
      return process.env[key] as string;
    }
  }

  try {
    // @ts-ignore
    if (import.meta && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}

  return '';
};

const getSettingsKey = (keyName: keyof AppSettings): string => {
  try {
    const saved = localStorage.getItem('serenity_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed[keyName] || '';
    }
  } catch (e) {
    // ignore
  }
  return '';
};

export const fetchBackendKeys = async (): Promise<boolean> => {
  try {
    // Check if we already have it
    if (backendOpenRouterKey) return true;

    console.log('Fetching API key from backend...');
    const backendUrl = 'https://nexoraindustries365.pythonanywhere.com';
    
    const response = await fetch(`${backendUrl}/api/config/openrouter-api-key`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.openrouter_api_key) {
            backendOpenRouterKey = data.openrouter_api_key;
            console.log('API key successfully retrieved from backend');
            return true;
        } else {
            console.error('Backend returned error:', data.message);
        }
    } else {
        console.error('Backend request failed:', response.status);
    }
  } catch (error) {
    console.error('Error fetching API key from backend:', error);
  }
  return false;
};

export const CONFIG = {
  get OPENROUTER_API() {
    // Priority: Backend -> Env -> Manual Settings
    return backendOpenRouterKey || getEnv('OPENROUTER_API') || getEnv('OPENROUTER_API_KEY') || getSettingsKey('keyOpenRouter');
  },
  get GNEWS_API_KEY() {
    // Priority: Env -> Hardcoded Key provided by user
    return getEnv('GNEWS_API_KEY') || '816096d818f28132af3e4cec69831bdb';
  }
};