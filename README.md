
# Serenity AI: Advanced Scientific Intelligence Hub

Serenity AI is a high-performance, browser-native personal AI application designed for technical analysis, scientific synthesis, and logical reasoning. Built as a "no-backend" solution, it leverages the cutting-edge **Gemini 3** series models to provide a desktop-class intelligence experience directly in the browser.

## 🚀 Vision
To provide an objective, data-driven companion that prioritizes empirical accuracy and structured logical output over casual conversation. Serenity AI is styled as a production-grade scientific interface.

## ✨ Core Features

### 🧠 Advanced Logical Processing
- **Deep Analysis Mode**: Utilizes `gemini-3-pro-preview` with an allocated `thinkingBudget` to expose the AI's "Thought Process" or logic chain before providing a final conclusion.
- **Intent Classification**: Every user query is pre-processed by `gemini-3-flash-preview` to determine if the user needs a logical chat, a scientific visualization (image generation), or real-time empirical data (news).
- **Session Persistence**: Complete chat histories are preserved across refreshes using localized storage logic.

### 🖼️ Scientific Visualizations
- **On-Demand Rendering**: Integrated image generation using the `gemini-2.5-flash-image` model.
- **Visualization Vault**: All generated images are archived in a persistent **IndexedDB** gallery, allowing users to revisit technical diagrams and AI-generated visuals at any time.

### 📰 Empirical Data Archives (News)
- **Real-time Synthesis**: Fetches the latest scientific and technical news via Google News RSS.
- **Contextual Summarization**: Instead of just listing links, the AI analyzes the news articles to provide a summarized technical brief relevant to the user's specific query.
- **Archival Storage**: Articles are stored in a local database to build a personal knowledge base over time.

### 🎨 Production-Grade UI/UX
- **Scientific Aesthetic**: A refined, midnight-themed interface using glassmorphism and monospace typography.
- **Markdown-Lite Engine**: Custom parsing for structured headers (`###`), bold emphasis (`**`), and bulleted lists to ensure technical clarity.
- **Responsive Architecture**: Mobile-optimized with safe-area support, ensuring a premium experience on both desktop and handheld devices.

## 🛠️ Technical Architecture

### ⚛️ Frontend Stack
- **Framework**: React 19 (Latest ESM builds).
- **Styling**: Tailwind CSS with custom glassmorphic utility classes.
- **Icons**: Lucide React for consistent, minimal iconography.
- **State Management**: React Hooks (useState, useEffect, useRef) for reactive UI updates.

### 🤖 AI Core (Google GenAI SDK)
- **Primary Model**: `gemini-3-pro-preview` for complex reasoning.
- **Secondary Model**: `gemini-3-flash-preview` for low-latency classification and metadata generation.
- **Imaging**: `gemini-2.5-flash-image` for native image synthesis.
- **Protocol**: Exclusively utilizes `process.env.API_KEY` for secure, direct-to-model communication.

### 💾 Data & Persistence
- **IndexedDB**: Used for heavy data like images and news article archives, ensuring the app remains functional and fast as the data grows.
- **LocalStorage**: Used for lightweight app configuration, theme toggles, and chat session metadata.
- **PWA Ready**: Includes a service worker (`sw.js`) and a web manifest (`manifest.json`) for offline capability and "Add to Home Screen" support.

## ⚙️ Configuration & Environment

The application requires a valid **Google Gemini API Key** provided via the environment.

### Environment Variables
| Variable | Description |
| :--- | :--- |
| `API_KEY` | **Required**. Your Google AI Studio API key for Gemini access. |

### Technical Constraints
- **Zero Backend**: All API calls originate from the client. No server-side processing is required.
- **Multi-line Input**: The chat interface supports multi-line queries (Shift+Enter or Enter for newline).
- **Logic Chain**: When `Deep Analysis` is enabled, the AI allocates specific tokens to internal reasoning to improve the accuracy of complex answers.

## 🧪 Scientific Directives (System Prompt)
The AI is governed by the `SYSTEM_CORE` directive:
- **Identity**: Serenity AI.
- **Role**: Advanced Scientific and Logical Assistant.
- **Behavior**: Objective, precise, technical, and analytical.
- **Formatting**: Structured output using headers and empirical data points.

---
*Developed by Anshuman Singh | Serenity Intelligence Platform v10.03.07*
