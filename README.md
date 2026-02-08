# AI Visual Novel with Ollama

An AI-powered visual novel game using local LLM via Ollama, built with Electron.

## Features

- 🎭 Interactive visual novel experience with AI-generated dialogue
- 🤖 Local LLM integration via Ollama (no API keys needed!)
- 🔄 Model selection - use any Ollama model you have installed
- 💻 Standalone Windows desktop application

## Requirements

1. **Node.js** (v18 or higher) - [Download Node.js](https://nodejs.org/)
2. **Ollama** - [Download Ollama](https://ollama.ai/)
3. At least one Ollama model (e.g., `ollama pull llama2`)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Ollama

Make sure Ollama is running:

```bash
ollama serve
```

### 3. Run Development

```bash
npm run dev
```

### 4. Build for Windows

```bash
npm run build:win
```

The built application will be in the `release/` folder.

## Usage

1. Launch the app
2. Click "Start Game" 
3. Select your preferred Ollama model in Settings
4. Enjoy your AI-powered visual novel experience!

## Recommended Models

For best roleplay and storytelling:

- `mistral` - Fast and good quality
- `llama2` - Balanced performance
- `gemma2` - Great for creative writing
- `qwen2.5` - Excellent for longer contexts

Larger models (13B+) will produce more creative and coherent responses.

## Development

- `npm run dev` - Run Vite dev server
- `npm run dev:electron` - Run with Electron in development
- `npm run build` - Build the web app
- `npm run build:win` - Build Windows installer

## Project Structure

```
visual-novel/
├── electron/           # Electron main process
│   ├── main.ts         # Main window & IPC handlers
│   ├── preload.ts      # Context bridge for Ollama API
│   └── ollama.ts       # Ollama REST client
├── resources/
│   ├── js/
│   │   ├── electron-entry.tsx    # App entry point
│   │   ├── services/
│   │   │   └── ollamaService.ts  # Frontend Ollama service
│   │   └── games/seiyo-high/
│   │       ├── App.tsx           # Main game component
│   │       └── components/
│   │           └── OllamaSettings.tsx  # Model selection UI
│   └── css/
├── index.html          # Entry HTML
├── vite.config.ts      # Vite configuration
└── package.json        # Dependencies & scripts
```

## License

Apache-2.0 (based on SeiyoHigh by ainimegamesplatform)
