
// This file is deprecated. Environment variables are managed by the build tool.
export const CONFIG = {
  get OPENROUTER_API() { return process.env.API_KEY || ''; },
  get GNEWS_API_KEY() { return '816096d818f28132af3e4cec69831bdb'; }
};
