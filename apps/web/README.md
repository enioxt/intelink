# EGOS Inteligência — Frontend Web

Interface web AI-first para EGOS Inteligência.

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 🏗️ Architecture

```
app/
├── chat/page.tsx          # Main chat interface
├── layout.tsx             # Root layout with theme
├── globals.css            # Global styles + CSS variables
components/
├── ui/                    # shadcn/ui components
├── chat/                  # Chat-specific components
│   ├── ChatSidebar.tsx
│   ├── MessageList.tsx
│   ├── ModelSelector.tsx
│   └── ToolPalette.tsx
└── tools/                 # Tool visualization cards
    ├── HIBPCard.tsx
    ├── ShodanCard.tsx
    ├── ImageAnalysisCard.tsx
    └── CNPJCard.tsx
lib/
└── utils.ts               # Utility functions
```

## 🎨 Design System

Follows EGOS Web Design Standard (`.guarani/WEB_DESIGN_STANDARD.md`):

- **Dark-only**: `#050508` background
- **Primary**: `#13b6ec` (cyan)
- **Typography**: Space Grotesk + JetBrains Mono
- **Glassmorphism**: `rgba(255,255,255,0.03)` surfaces
- **4pt grid**: All spacing in 4px increments

## 🤖 AI Features

- **useChat** from Vercel AI SDK
- **Tool calls**: Select tools from palette
- **Local models**: Ollama integration with auto-detection
- **Remote models**: OpenAI, Claude, Gemini fallback
- **Privacy-first**: Local by default

## 🔧 Environment Variables

```bash
# API endpoint (proxy configured in next.config.js)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📦 Dependencies

- Next.js 14 + App Router
- Tailwind CSS 3.4
- shadcn/ui components
- Vercel AI SDK
- Cytoscape.js (graph viz)
- Leaflet (maps)

---

**EGOS Inteligência v2.0** — Dados públicos brasileiros com IA
