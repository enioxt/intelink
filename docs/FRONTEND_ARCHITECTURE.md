# EGOS Inteligência — Frontend Architecture V2

**Versão:** 2.0.0  
**Data:** 2026-04-08  
**Status:** Design Document  
**Sacred Code:** 000.111.369.963.1618

---

## 🎯 Visão

Frontend **AI-first** que expõe todas as capacidades do backend via **chatbot central com tool calls**, seguindo padrões de:
- **Vercel AI SDK** (useChat, streaming, tool calls)
- **Linear.app** (UI density, command palette, shortcuts)
- **OpenAI ChatGPT** (plugin system, tool visualization)
- **Claude Code** (context awareness, file operations)

---

## 🏗️ Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────────┐
│                    EGOS INTELIGÊNCIA FRONTEND                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   CHATBOT   │◄──►│   TOOLS     │◄──►│  DASHBOARD  │        │
│  │   CENTRAL   │    │   SYSTEM    │    │   SHELL     │        │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │
│         │                   │                   │               │
│         └───────────────────┴───────────────────┘               │
│                      AI ORCHESTRATOR                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              LOCAL MODEL SUPPORT (Ollama)                │   │
│  │  - llama3.2, mistral, qwen2.5, phi4, gemma2           │   │
│  │  - Embeddings locais (nomic-embed-text)                 │   │
│  │  - Privacy-first: dados nunca saem do ambiente         │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  OSINT   │ │  PCMG    │ │TRANS-    │ │  GRAPH   │          │
│  │  MODULE  │ │ PIPELINE │ │PARENCY   │ │   VIZ    │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  EGOS API        │
                    │  (FastAPI)       │
                    │  26+ routers     │
                    └─────────────────┘
```

---

## 🤖 Chatbot Central — Design System

### Layout Principal (Linear-inspired)

```
┌─────────────────────────────────────────────────────────────┐
│  EGOS ┃ Inteligência Policial              [Search] [User]  │
├────────┬────────────────────────────────────────────────────┤
│        │                                                    │
│  NAV   │  ┌────────────────────────────────────────────┐    │
│        │  │ 🗂️  Contexto Ativo: PCMG Pipeline        │    │
│  🏠 Home│  │    ┃ REDS 123456/2024 ┃ Video Processando│    │
│  💬 Chat│  └────────────────────────────────────────────┘    │
│  🔍 OSINT│                                                    │
│  📁 PCMG│  ┌────────────────────────────────────────────┐    │
│  📊 Data│  │ 👤 Usuário: Verificar se email foi vazado │    │
│  🔗 Links│  │                                             │    │
│  ⚙️ Config│  │ 🤖 EGOS: Analisando com HIBP...            │    │
│        │  │                                             │    │
│  ──────│  │ 📊 Resultado:                               │    │
│  Recent │  │ • 3 vazamentos encontrados                 │    │
│  ──────│  │ • Risco: ALTO                               │    │
│  Chat 1 │  │ • Dados expostos: senhas, telefone         │    │
│  Chat 2 │  │                                             │    │
│  Chat 3 │  │ 🔗 Ver detalhes ┃ 📝 Salvar relatório      │    │
│        │  └────────────────────────────────────────────┘    │
│        │                                                    │
│        │  ┌────────────────────────────────────────────┐    │
│        │  │ 🛠️ Tools disponíveis:                     │    │
│        │  │ [HIBP] [Shodan] [CNPJ] [Image] [Graph]    │    │
│        │  └────────────────────────────────────────────┘    │
│        │                                                    │
│        │  ┌────────────────────────────────────────────┐    │
│        │  │ ▶️  Digite sua pergunta ou / para comandos   │    │
│        │  │     Mic 🎤  ┃  📎 Anexar  ┃  ⬆️ Enviar      │    │
│        │  └────────────────────────────────────────────┘    │
│        │                                                    │
└────────┴────────────────────────────────────────────────────┘
```

---

## 🛠️ Tool System Architecture

### Categorias de Tools

| Categoria | Tools | AI vs Determinístico |
|-----------|-------|---------------------|
| **OSINT** | HIBP, Shodan, Image Analysis | 🔴 Determinístico (APIs externas) |
| **Dados Públicos** | CNPJ, Emendas, CEAP, Licitações | 🔴 Determinístico (dados oficiais) |
| **PCMG** | Video Upload, Document Process | 🟡 Híbrido (AI para análise) |
| **Análise** | Cross-reference, Pattern Detection | 🟢 AI (interpretação de padrões) |
| **Visualização** | Graph Viz, Timeline, Maps | 🟢 AI (layout e destaque) |

### Tool Call Flow

```typescript
// 1. User sends message with potential tool need
const message = "Verifique se email@empresa.com foi vazado e analise o IP 192.168.1.1";

// 2. AI decides which tools to call (OpenRouter/Local LLM)
const toolCalls = [
  { name: "hibp_check_email", arguments: { email: "email@empresa.com" } },
  { name: "shodan_host_lookup", arguments: { ip: "192.168.1.1" } }
];

// 3. Frontend executes tools in parallel
const results = await Promise.all(toolCalls.map(execTool));

// 4. AI synthesizes results into natural language
const response = await generateText({
  model: selectedModel, // Can be local (Ollama) or remote
  tools: availableTools,
  messages: [...history, { role: "tool", content: results }]
});
```

---

## 🖥️ Componentes Principais

### 1. ChatInterface (Main)
```typescript
// apps/web/app/chat/page.tsx
export default function ChatPage() {
  const { messages, input, handleSubmit, toolCalls } = useChat({
    api: '/api/chat',
    streamProtocol: 'text',
    onToolCall: async (toolCall) => {
      // Execute local or remote tool
      return await executeTool(toolCall);
    }
  });

  return (
    <div className="flex h-screen bg-neutral-950">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <ChatHeader />
        <MessageList messages={messages} toolCalls={toolCalls} />
        <ChatInput 
          input={input}
          onSubmit={handleSubmit}
          toolSelector={<ToolPalette />}
        />
      </main>
    </div>
  );
}
```

### 2. ToolVisualization Components

```typescript
// HIBP Result Component
export function HIBPResultCard({ result }: { result: HIBPResult }) {
  return (
    <div className={`p-4 rounded-lg border ${
      result.risk_level === 'high' ? 'border-red-500 bg-red-500/10' :
      result.risk_level === 'medium' ? 'border-amber-500 bg-amber-500/10' :
      'border-emerald-500 bg-emerald-500/10'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <Shield className={riskColor(result.risk_level)} />
        <h3 className="font-semibold">Have I Been Pwned</h3>
        <Badge variant={result.risk_level}>
          {result.breaches_found} vazamentos
        </Badge>
      </div>
      <p className="text-sm text-neutral-400 mb-2">
        Email: {result.email} {/* Masked: j***@gmail.com */}
      </p>
      <ul className="space-y-1 text-sm">
        {result.exposed_data_types.map(type => (
          <li key={type} className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            {translateDataType(type)}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Shodan Result Component
export function ShodanResultCard({ result }: { result: ShodanResult }) {
  return (
    <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold">Shodan Analysis</h3>
          <Badge variant="default">{result.ip}</Badge>
        </div>
        <a href={result.query_url} target="_blank" rel="noopener"
           className="text-xs text-blue-400 hover:underline">
          Ver no Shodan →
        </a>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-3">
        <Stat label="Portas Abertas" value={result.ports.length} />
        <Stat label="Vulnerabilidades" value={result.vulnerabilities.total} 
              danger={result.vulnerabilities.critical > 0} />
      </div>
      
      {result.risk_indicators.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-red-400">Indicadores de Risco:</p>
          {result.risk_indicators.map((indicator, i) => (
            <p key={i} className="text-xs text-red-300 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {indicator}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3. Image Analysis Component

```typescript
export function ImageMetadataCard({ metadata }: { metadata: ImageMetadata }) {
  return (
    <div className="p-4 rounded-lg border border-purple-500/30 bg-purple-500/5">
      <div className="flex items-center gap-2 mb-3">
        <ImageIcon className="w-5 h-5 text-purple-500" />
        <h3 className="font-semibold">Análise Forense de Imagem</h3>
        <Badge variant={metadata.osint_value}>
          Valor OSINT: {metadata.osint_value}
        </Badge>
      </div>
      
      {/* GPS Section */}
      {metadata.gps && (
        <div className="mb-3 p-3 bg-neutral-900 rounded">
          <p className="text-xs text-neutral-400 mb-1">📍 Localização GPS</p>
          <p className="text-sm font-mono">{metadata.gps.coordinates}</p>
          <a href={metadata.gps.google_maps} target="_blank"
             className="text-xs text-blue-400 hover:underline mt-1 inline-block">
            Abrir no Google Maps →
          </a>
        </div>
      )}
      
      {/* Device Info */}
      {metadata.device && (
        <div className="mb-3">
          <p className="text-xs text-neutral-400">📱 Dispositivo</p>
          <p className="text-sm">{metadata.device.make} {metadata.device.model}</p>
        </div>
      )}
      
      {/* Timestamps */}
      {Object.entries(metadata.timestamps).length > 0 && (
        <div>
          <p className="text-xs text-neutral-400 mb-1">📅 Timestamps</p>
          {Object.entries(metadata.timestamps).map(([key, value]) => (
            <p key={key} className="text-xs font-mono">
              {key}: {value}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🏠 Local Model Support

### Ollama Integration

```typescript
// lib/ai/local-models.ts
export const LOCAL_MODELS = {
  'llama3.2': {
    name: 'Llama 3.2',
    description: 'Meta - Melhor para geral',
    contextWindow: 128000,
    recommended: true,
  },
  'qwen2.5': {
    name: 'Qwen 2.5',
    description: 'Alibaba - Melhor para código/análise',
    contextWindow: 128000,
    recommended: true,
  },
  'mistral': {
    name: 'Mistral',
    description: 'Mistral AI - Rápido e eficiente',
    contextWindow: 32000,
    recommended: true,
  },
  'phi4': {
    name: 'Phi-4',
    description: 'Microsoft - Excelente reasoning',
    contextWindow: 16000,
    recommended: false,
  },
  'gemma2': {
    name: 'Gemma 2',
    description: 'Google - Leve e rápido',
    contextWindow: 8000,
    recommended: false,
  },
} as const;

export async function checkOllamaStatus(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:11434/api/tags');
    return res.ok;
  } catch {
    return false;
  }
}

export async function listLocalModels(): Promise<string[]> {
  const res = await fetch('http://localhost:11434/api/tags');
  const data = await res.json();
  return data.models?.map((m: any) => m.name) || [];
}
```

### Model Selector UI

```typescript
export function ModelSelector() {
  const [localModels, setLocalModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('ollama/llama3.2');
  const [isLocal, setIsLocal] = useState(true);
  
  useEffect(() => {
    checkOllamaStatus().then(ok => {
      if (ok) listLocalModels().then(setLocalModels);
    });
  }, []);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-neutral-900 border border-neutral-800">
        <Cpu className="w-4 h-4 text-emerald-500" />
        <span className="text-sm">
          {isLocal ? '🏠 Local' : '☁️ Remoto'}: {selectedModel}
        </span>
        <ChevronDown className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80">
        <DropdownMenuLabel>Modelos Locais (Ollama)</DropdownMenuLabel>
        {localModels.map(model => (
          <DropdownMenuItem 
            key={model}
            onClick={() => { setSelectedModel(`ollama/${model}`); setIsLocal(true); }}
          >
            <Cpu className="w-4 h-4 mr-2" />
            {model}
            {LOCAL_MODELS[model]?.recommended && (
              <Badge className="ml-auto bg-emerald-500/20">Recomendado</Badge>
            )}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Modelos Remotos</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => { setSelectedModel('openai/gpt-4o'); setIsLocal(false); }}>
          <Cloud className="w-4 h-4 mr-2" />
          GPT-4o
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setSelectedModel('anthropic/claude-3-sonnet'); setIsLocal(false); }}>
          <Cloud className="w-4 h-4 mr-2" />
          Claude 3.5 Sonnet
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setSelectedModel('google/gemini-1.5-pro'); setIsLocal(false); }}>
          <Cloud className="w-4 h-4 mr-2" />
          Gemini 1.5 Pro
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## 📊 Dashboard Shell

### Overview Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  EGOS Inteligência ┃ Dashboard                  [Settings]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  📊 Visão Geral do Sistema                              ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       ││
│  │  │ 77M     │ │ 12      │ │ 26      │ │ 1,247   │       ││
│  │  │Entidades│ │ Fontes  │ │ Routers │ │Consultas│       ││
│  │  │  Neo4j  │ │  Dados  │ │   API   │ │ Hoje    │       ││
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌──────────────────┐ ┌─────────────────────────────────────┐│
│  │ 🔍 OSINT Activity│ │ 📈 Trending Searches               ││
│  │                  │ │                                     ││
│  │  • HIBP: 45     │ │  1. CNPJ 12.345.678/0001-90        ││
│  │  • Shodan: 12   │ │  2. Mandados de prisão: Silva      ││
│  │  • Images: 8    │ │  3. Emendas Patos de Minas         ││
│  │  • CNPJ: 203    │ │  4. Licitações MG 2024             ││
│  │                  │ │  5. Empresa: Construtora XYZ       ││
│  └──────────────────┘ └─────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🛠️ Ferramentas Disponíveis (Clique para usar no Chat)  ││
│  │                                                          ││
│  │  [HIBP] [Shodan] [CNPJ] [Image] [BNMP] [DataJud] [CEAP] ││
│  │  [Licit] [Emendas] [Graph] [Cross-Ref] [PCMG]          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🎥 PCMG Pipeline Status                                  ││
│  │                                                          ││
│  │  🟢 Processando: 2 videos ┃ 🟡 Fila: 5 docs ┃ ✅ Done:  ││
│  │  12                                                       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Módulos Especializados

### OSINT Module
```typescript
// app/osint/page.tsx
export default function OSINTPage() {
  return (
    <ModuleLayout
      title="OSINT Brasil"
      description="Open Source Intelligence para investigações"
      tools={[
        { id: 'hibp', name: 'Email Breach Check', icon: Shield, component: HIBPForm },
        { id: 'shodan', name: 'Infrastructure Analysis', icon: Globe, component: ShodanForm },
        { id: 'image', name: 'Image Forensics', icon: ImageIcon, component: ImageUpload },
        { id: 'username', name: 'Username Search', icon: User, component: UsernameForm },
      ]}
    />
  );
}
```

### PCMG Module
```typescript
// app/pcmg/page.tsx
export default function PCMGPage() {
  return (
    <ModuleLayout
      title="PCMG Pipeline"
      description="Processamento de vídeos e documentos policiais"
    >
      <div className="grid grid-cols-2 gap-6">
        <VideoUploadZone 
          onUpload={handleVideoUpload}
          supportedFormats={['.mp4', '.avi', '.mov', '.mkv']}
        />
        <DocumentUploadZone
          onUpload={handleDocUpload}
          supportedFormats={['.pdf', '.docx', '.xlsx', '.txt']}
        />
      </div>
      <ProcessingQueue jobs={jobs} />
      <ResultsGallery results={results} />
    </ModuleLayout>
  );
}
```

### Graph Visualization Module
```typescript
// app/graph/page.tsx
export default function GraphPage() {
  const [selectedNode, setSelectedNode] = useState<Entity | null>(null);
  
  return (
    <div className="h-screen flex">
      <GraphCanvas
        data={graphData}
        onNodeClick={setSelectedNode}
        layout="force-directed"
      />
      <NodeSidebar 
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}
```

---

## 🔐 Privacy-First Architecture

### Data Flow Decision Tree

```
User Input
    │
    ├──► Não contém PII sensível? ──► Pode usar modelo remoto (OpenAI/Claude)
    │
    ├──► Contém PII (CPF, email, nome)? 
    │    │
    │    ├──► Modelo local disponível? ──► Usar Ollama (privado)
    │    │
    │    └──► Modelo local indisponível 
    │         │
    │         ├──► Mascarar PII ──► Enviar para modelo remoto
    │         │
    │         └──► Guard Brasil inspection ──► Confirmar masking
    │
    └──► Dados sigilosos (investigação)? ──► 🔴 APENAS modelo local
```

### Deterministic vs AI Decision Matrix

| Operação | Tipo | Justificativa |
|----------|------|---------------|
| **Validação de CPF/CNPJ** | 🔴 Determinístico | Algoritmo matemático |
| **Consulta API externa** | 🔴 Determinístico | Dados oficiais |
| **PII Masking** | 🔴 Determinístico | Guard Brasil regex |
| **Análise de contexto** | 🟢 AI | Interpretação necessária |
| **Sugestão de correlações** | 🟢 AI | Pattern matching complexo |
| **Geração de relatórios** | 🟡 Híbrido | Template + AI synthesis |
| **Visualização de grafos** | 🟢 AI | Layout automático |
| **Chat geral** | 🟢 AI | Natural language |

---

## 📦 Tech Stack

### Core
- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand (local) + TanStack Query (server)
- **AI:** Vercel AI SDK (`useChat`, `useCompletion`)

### Visualization
- **Graph:** Cytoscape.js ou D3.js
- **Maps:** Leaflet (OpenStreetMap)
- **Charts:** Recharts
- **Timeline:** Vis.js

### Local AI
- **Runtime:** Ollama
- **Embeddings:** nomic-embed-text (Ollama)
- **Fallback:** LM Studio

### Build & Deploy
- **Package:** pnpm
- **Lint:** ESLint + Prettier
- **Test:** Vitest + Playwright
- **Deploy:** Docker + VPS (self-hosted)

---

## 🎯 Implementation Roadmap

### Sprint 1: Foundation (Semana 1)
- [ ] Setup Next.js project with shadcn/ui
- [ ] Implement base chat interface (useChat)
- [ ] Model selector (local + remote)
- [ ] Basic layout (sidebar + main)

### Sprint 2: Tools Integration (Semana 2)
- [ ] HIBP visualization component
- [ ] Shodan visualization component
- [ ] Image analysis component
- [ ] Tool call system implementation

### Sprint 3: Modules (Semana 3)
- [ ] OSINT module page
- [ ] PCMG pipeline UI
- [ ] Dashboard overview
- [ ] Graph visualization placeholder

### Sprint 4: Polish (Semana 4)
- [ ] Dark mode optimization
- [ ] Responsive design
- [ ] Loading states
- [ ] Error handling
- [ ] Local model auto-detection

---

## 📚 References

- **852 Chat Implementation:** `/home/enio/852/src/app/chat/page.tsx`
- **EGOS Inteligência API:** `/home/enio/egos-inteligencia/api/src/egos_inteligencia/main.py`
- **OSINT Tools:** `/home/enio/egos-inteligencia/api/src/egos_inteligencia/services/osint_tools.py`
- **Vercel AI SDK:** https://sdk.vercel.ai/docs
- **shadcn/ui:** https://ui.shadcn.com
- **Ollama API:** https://github.com/ollama/ollama/blob/main/docs/api.md

---

**Próximo passo:** Implementar estrutura base do frontend na pasta `apps/web/` do EGOS Inteligência.
