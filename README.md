# Serenity AI - Personalized Assistant

Serenity AI is a beautiful, personalized web-based AI assistant designed to provide a romantic and helpful companion experience. It features real-time chat, image generation, and news updates in a modern, glassmorphic UI.

## Features

- **Personalized Chat**: 
  - Uses **OpenRouter** (GPT-3.5 default) for primary conversation.
  - Automatic fallback to **Google Gemini 2.5 Flash** if OpenRouter fails.
  - customizable user and partner names and system personality.
  - Chat history persistence via LocalStorage.

- **Image Generation**: 
  - Integrated **Hugging Face** API using the `FLUX.1-dev` model to generate high-quality images from text prompts.
  - Generated images can be sent directly into the chat stream.

- **News Feed**: 
  - Real-time news updates via **GNews API**.
  - Displays latest headlines with images and links.

- **UI/UX**: 
  - Fully responsive Mobile-first design.
  - Aesthetic Glassmorphism effects.
  - Smooth animations and transitions.

## Environment Variables

To fully utilize all features, you need to configure the following API keys in your environment (e.g., `.env` file):

| Variable Name | Service | Description |
| :--- | :--- | :--- |
| `OPENROUTER_API` | OpenRouter | **Required**. Used for the main chat functionality (access to GPT, Claude, Llama, etc.). |
| `GEMINI_API_KEY` | Google Gemini | **Optional**. Used as a fallback chat engine if OpenRouter is unavailable. |
| `HUGGINGFACE_API_KEY` | Hugging Face | **Required**. Used for generating images via the FLUX.1-dev model. |
| `GNEWS_API_KEY` | GNews | **Required**. Used to fetch the latest lifestyle and technology news. |

### Example `.env` file

```env
OPENROUTER_API=sk-or-v1-...
GEMINI_API_KEY=AIzaSy...
HUGGINGFACE_API_KEY=hf_...
GNEWS_API_KEY=...
```

## Getting Started

1.  **Clone the repository**.
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Set up keys**: Create a `.env` file in the root directory and add the keys listed above.
4.  **Run the app**:
    ```bash
    npm start
    ```

## Customization

Click the **Settings** (gear icon) in the sidebar to change:
- **Your Name**: The name the AI calls itself.
- **Partner Name**: The name the AI calls you.
- **System Personality**: The core instructions for how the AI behaves (e.g., "be romantic," "be professional").

## Technologies

- React 19
- Tailwind CSS
- Lucide React (Icons)
- Google GenAI SDK
