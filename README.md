
# 🌌 Serenity AI: The Personalized Neural Ecosystem

**Serenity AI** is a next-generation, high-performance AI companion and workspace. Built with a focus on aesthetics and multi-modal intelligence, it combines advanced language processing, custom real-time web intelligence, and high-fidelity image generation into a unified, glassmorphic experience.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/frontend-React%2019-blue)
![Intelligence](https://img.shields.io/badge/AI-OpenRouter%20%2B%20Gemini-purple)

## ✨ Core Pillars

### 🧠 1. Neural Conversation Engine
Leverages the **Gemini 2.0 Flash** model (via OpenRouter) for hyper-fast, intelligent, and context-aware responses. The system includes an intention classifier that automatically switches between general chat, image generation, news fetching, and live web research.

### 🌐 2. Live Web Intelligence (Autonomous Browser)
Unlike standard LLMs with training cutoffs, Serenity features a custom-built **Manual Web Scraper**. 
- **Intention Detection**: Recognizes when a query requires real-time data.
- **Autonomous Search**: Mimics browser behavior to query search engines.
- **Deep Reading**: Reaches out to websites using CORS proxies, extracts clean text (stripping ads/scripts), and synthesizes a concluding response from the live data.

### 🎨 3. Imagination Vault (Creative Suite)
Integrated with **Hugging Face's FLUX.1-dev** model.
- **Prompt Engineering**: Automatically refines user ideas into professional-grade artistic prompts.
- **Local Persistence**: Uses IndexedDB for native storage, allowing your "Imagination Vault" to persist across sessions without cloud costs.

### 📰 4. Global Intel Feed
Synthesizes real-time news from verified global agencies using **GNews** and **Google News RSS**. It provides concise summaries of world events directly in your chat flow.

### 🧪 5. Advanced Math & Code
Full support for **KaTeX** mathematical rendering (LaTeX) and syntax-highlighted code blocks with integrated "One-Tap Copy" functionality.

---

## 🛠 Tech Stack

- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS (Custom Glassmorphism)
- **Icons**: Lucide React
- **Mathematics**: KaTeX (Fastest LaTeX engine)
- **Database**: IndexedDB (Native Browser Storage for Media)
- **AI Orchestration**: 
  - **Text**: OpenRouter (Gemini 2.0 Flash / GPT-3.5)
  - **Images**: Hugging Face (FLUX / Stable Diffusion)
  - **Search**: Custom Proxy-based Web Scraper

---

## 🚀 Getting Started

### 1. Installation
```bash
git clone https://github.com/yourusername/serenity-ai.git
cd serenity-ai
npm install
```

### 2. Configuration
Create a `.env` file in the root:
```env
OPENROUTER_API=your_openrouter_key
GEMINI_API_KEY=your_gemini_key
HUGGINGFACE_API_KEY=your_hf_key
GNEWS_API_KEY=your_gnews_key
```

### 3. Execution
```bash
npm run dev
```

---

## 👨‍💻 Author
**Anshuman Singh**  
*Physicist & Full-Stack Developer*

Dedicated to pushing the boundaries of human-AI interaction through beautiful design and robust engineering.

---
*Developed with ❤️ for the AI community.*
