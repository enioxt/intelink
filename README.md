# Intelink

> 🎯 Plataforma de inteligência open-source para dados públicos brasileiros — feita para investigadores, analistas e desenvolvedores.
> 
> Um projeto **EGOS Inteligência**

**🌐 Acesse:** https://intelink.ia.br · **📜 Licença:** MIT · **⚡ Stack:** Next.js 15 + FastAPI + Neo4j

> **Para agentes AI / LLMs:** Comece por [`docs/MASTER_INDEX.md`](docs/MASTER_INDEX.md) — mapeia todo o sistema com links para cada domínio.

---

## 🎯 O que é o Intelink?

O **Intelink** é uma plataforma de **Inteligência de Dados Públicos** que transforma informações dispersas do Brasil (CNPJ, eleições, licitações, gastos públicos) em **rede de conhecimento investigável**.

💡 Ideal para:
- 🔍 **Investigadores policiais** — mapear conexões entre pessoas, empresas e veículos
- 📊 **Analistas de dados** — detectar padrões em grandes volumes de registros
- 💻 **Desenvolvedores** — integrar dados públicos brasileiros em suas aplicações
- 📰 **Jornalistas** — cruzar informações de fontes oficiais

---

## ✨ O que o Intelink faz?

| Funcionalidade | Descrição |
|----------------|-----------|
| 🕸️ **Grafo Investigativo** | Mapeia entidades (pessoas, empresas, veículos) e suas relações em 77M+ registros públicos |
| 🤖 **Chat com IA** | Faça perguntas em português natural e receba respostas com fontes e níveis de confiança |
| 🔗 **Cruzamento de Dados** | Detecta quando uma entidade aparece em múltiplas investigações (6 níveis de confiança: CPF exato → nome aproximado) |
| 📈 **Detecção de Padrões** | Anomalias pela Lei de Benford, comparação de modus operandi, matching comportamental |
| 📄 **Relatórios de Inteligência** | Gera relatórios estruturados para delegados, promotores e juízes (templates estilo Arkham) |
| 🛡️ **Privacidade by Design** | CPF/CNPJ sempre mascarados na saída, logs auditáveis em modo append-only (LGPD-compliant) |

## 🏗️ Stack Tecnológico

| Camada | Tecnologia | Por que escolhemos |
|--------|------------|-------------------|
| 🎨 **Frontend** | Next.js 15 + TypeScript + Tailwind v4 | Performance, tipagem segura, DX moderno |
| ⚙️ **Backend** | Python 3.12 + FastAPI | Async nativo, OpenAPI automático, ecosistema ML |
| 🕸️ **Banco de Grafos** | Neo4j 5.x (77M+ nós, 25M+ arestas) | Consultas complexas de relacionamento em milissegundos |
| 💾 **Cache** | Redis 7 | Sessões, rate limiting, embeddings |
| 🧠 **IA/LLM** | OpenRouter (Gemini Flash) + Qwen-plus | Fallbacks resilientes, custo otimizado |
| 🔐 **Autenticação** | JWT RS256 + bcrypt + refresh tokens | Segurança enterprise, compatível com edge |
| 🚀 **Deploy** | Docker Compose + Caddy + VPS | Simples, reprodutível, custo acessível |

## 🚀 Comece em 5 minutos

```bash
# 1. Clone o repositório
git clone https://github.com/enioxt/intelink
cd intelink

# 2. Configure suas chaves (veja .env.example para detalhes)
cp .env.example .env
# Edite .env com: NEO4J_PASSWORD, OPENROUTER_API_KEY, JWT_SECRET_KEY

# 3. Suba a stack completa
docker compose up -d

# 4. Acesse 🎉
# http://localhost:3000   → Interface principal
# http://localhost:8000   → API + Documentação Swagger
# http://localhost:7474   → Neo4j Browser (explore o grafo!)
```

📖 Veja [`.env.example`](.env.example) para todas as variáveis necessárias.

---

## 🤖 Configuração de Inteligência Artificial (Multi-Provider)

O Intelink é **agnóstico de provedor de IA** — você escolhe qual usar ou configurar múltiplos para fallback automático.

### 🎯 Guia Rápido: Comece de Graça

| Provedor | Custo | Melhor Para | Link |
|----------|-------|-------------|------|
| **🥇 DashScope (Alibaba)** | **1M tokens GRÁTIS** | Português, custo-benefício | [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com) |
| **🥈 Google AI Studio** | **1,500 req/dia GRÁTIS** | Desenvolvimento, prototipagem | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **🥉 OpenRouter** | Modelos gratuitos disponíveis | Acesso a múltiplos modelos | [openrouter.ai](https://openrouter.ai) |

### 💰 Tabela de Modelos Custo-Benefício (Preços por 1M tokens)

| Modelo | Provedor | Input | Output | Qualidade | PT-BR |
|--------|----------|-------|--------|-----------|-------|
| **Kimi K2.5** | OpenRouter | ~$0.50 | ~$1.50 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **MiniMax** | OpenRouter | ~$0.18 | ~$1.09 | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Nemotron-4** | OpenRouter | ~$0.20 | ~$0.20 | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Gemini 2.0 Flash** | Google/OpenRouter | **GRÁTIS** / $0.35 | **GRÁTIS** / $1.05 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Qwen-Plus** | DashScope | ~$0.50 | ~$1.00 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Qwen-Turbo** | DashScope | ~$0.12 | ~$0.25 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Claude 3.5 Sonnet** | Anthropic | $3.00 | $15.00 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **GPT-4o-mini** | OpenAI | $0.15 | $0.60 | ⭐⭐⭐⭐ | ⭐⭐⭐ |

> 💡 **Dica:** Para investigações em português, recomendamos **Qwen-Plus** (DashScope) ou **Gemini 2.0 Flash** — ambos têm excelente compreensão de contexto jurídico brasileiro.

### 📋 Passo a Passo: Obter APIs Gratuitas

#### 🥇 DashScope (Alibaba) — 1M Tokens Grátis

1. Acesse: https://dashscope.console.aliyun.com
2. Clique em **"Get API Key"** ou **"创建API Key"** (Criar API Key)
3. Faça login com Google, GitHub ou crie conta Alibaba
4. Copie a chave (formato: `sk-...`)
5. Cole em `.env`: `DASHSCOPE_API_KEY=sk-sua-chave`

**Modelos recomendados:**
- `qwen-plus` — melhor custo-benefício geral
- `qwen-turbo` — mais barato para tarefas simples
- `qwen-max` — máxima qualidade (mais caro)

#### 🥈 Google AI Studio — 1,500 Requests/Dia Grátis

1. Acesse: https://aistudio.google.com/app/apikey
2. Faça login com sua conta Google
3. Clique em **"Create API Key"**
4. Selecione projeto (ou crie "Intelink")
5. Copie a chave (formato: `AIza...`)
6. Cole em `.env`: `GOOGLE_AI_API_KEY=AIza-sua-chave`

**Vantagens:**
- ✅ Não precisa de cartão de crédito
- ✅ 1,500 requests/dia no tier gratuito
- ✅ Gemini 2.0 Flash muito capaz
- ✅ Funciona diretamente (sem proxy)

#### 🥉 OpenRouter — Acesso Universal

1. Acesse: https://openrouter.ai
2. Crie conta (email ou GitHub)
3. Vá em **"Keys"** → **"Create Key"**
4. Copie a chave (formato: `sk-or-v1-...`)
5. Cole em `.env`: `OPENROUTER_API_KEY=sk-or-v1-sua-chave`

**Modelos gratuitos OpenRouter (limitados por dia):**
- `google/gemini-2.0-flash-exp:free` — 20 req/min
- `meta-llama/llama-3.2-3b-instruct:free` — 20 req/min
- `nousresearch/hermes-3-llama-3.1-405b:free` — 20 req/min

### ⚙️ Configuração Multi-Provider (Fallback Automático)

Configure múltiplas APIs no `.env` para redundância:

```bash
# Configure todas as que tiver
DASHSCOPE_API_KEY=sk-...
GOOGLE_AI_API_KEY=AIza...
OPENROUTER_API_KEY=sk-or-v1-...

# Defina ordem de prioridade
AI_PROVIDER_PRIORITY=dashscope,google,openrouter
```

O Intelink tentará na ordem: se DashScope falhar, usa Google, depois OpenRouter.

### 🎓 Recomendações por Cenário

| Cenário | Provedor Recomendado | Modelo | Por Quê |
|---------|---------------------|--------|---------|
| **Investigação policial** | DashScope | `qwen-plus` | Excelente em português jurídico |
| **Análise de documentos** | Google AI | `gemini-2.0-flash` | Grande contexto (128k tokens) |
| **Chat com cidadão** | OpenRouter (free) | `gemini-2.0-flash:free` | Custo zero |
| **Relatório formal** | Anthropic | `claude-3-5-sonnet` | Qualidade superior de redação |
| **Processamento em massa** | DashScope | `qwen-turbo` | Preço competitivo |

## 📁 Estrutura do Projeto

```
intelink/                              # 📁 Diretório do projeto (após clone)
├── api/                               # 🐍 Backend FastAPI
│   └── src/intelink/                  # Código-fonte principal
│       ├── routers/                   # 20+ módulos de rotas REST
│       ├── services/                  # Lógica de negócio + NLP + padrões
│       │   ├── nlp/                   # 🤖 BERTimbau NER (português!)
│       │   └── patterns/              # 🕵️ Detecção de padrões criminais
│       └── middleware/                # 🛡️ Máscara de PII, rate limit
├── frontend/                          # ⚛️ Next.js 15 App Router
│   └── src/
│       ├── app/                       # Páginas (investigações, grafo, chat)
│       ├── components/                # 130+ componentes React
│       └── lib/
│           ├── intelligence/          # 🧠 Cruzamento de dados, IA
│           ├── analysis/              # 📊 Modus operandi, sumários
│           ├── legal/                 # ⚖️ Artigos criminais brasileiros
│           ├── detectors/             # 🔍 Anomalia de Benford, HHI
│           ├── auth/                  # 🔐 JWT, RBAC, sessões
│           └── reports/               # 📄 Templates estilo Arkham
├── infra/                             # 🐳 Docker + Caddy
├── docs/                              # 📚 Documentação
└── AGENTS.md                          # 🤖 System map
```

## 🔌 Principais Endpoints da API

| Método | Endpoint | O que faz |
|--------|----------|-----------|
| `POST` | `/api/v1/auth/login` | 🔐 Login JWT |
| `GET`  | `/api/v1/entity/{id}` | 🔍 Busca entidade (CPF/CNPJ/nome) |
| `POST` | `/api/v1/search` | 🔎 Busca full-text + grafo |
| `GET`  | `/api/v1/graph/ego` | 🕸️ Rede ego de uma entidade |
| `POST` | `/api/v1/chat` | 💬 Chat com IA + contexto do grafo |
| `POST` | `/api/v1/investigation` | 🕵️ Criar/gerenciar investigações |
| `GET`  | `/api/v1/patterns` | 📈 Detectar padrões comportamentais |
| `GET`  | `/health` | ❤️ Health check |

📖 Documentação Swagger completa em `/docs` quando rodando localmente.

## 🤝 Como Contribuir

Quer fazer parte? Ótimo! Veja [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes completos.

### TL;DR — Fluxo Rápido:

1. 🍴 **Fork** → crie branch `feat/sua-feature`
2. 🐳 `docker compose up -d` para stack local
3. ✍️ PR com descrição do que mudou e por quê
4. ✅ Requisitos: build passando + sem erros de lint + PII masking intacto

### 💡 O que precisamos agora:

- 🌍 Mais fontes de dados públicos brasileiros
- 🤖 Melhorias no NER (reconhecimento de entidades em PT-BR)
- 📊 Novos detectores de padrões
- 🛡️ Hardening de segurança
- 📚 Documentação em português

**Toda contribuição é bem-vinda!** 🎉

## 🛡️ Segurança & Privacidade (LGPD-Compliant)

| Aspecto | Implementação |
|---------|---------------|
| **PII** | CPF, CNPJ, email, telefone sempre **mascarados** na saída da API — nunca armazenados em logs |
| **Auth** | JWT RS256, cookies de refresh HTTP-only, bcrypt 14 rounds |
| **Rate Limit** | 60 req/min anônimo, 300 req/min autenticado |
| **Audit** | Log append-only para todo acesso a entidades (compliance LGPD) |
| **Dados** | Apenas **dados públicos** — sem acesso a bases restritas |

🔒 **Privacidade é prioridade:** projetamos com privacidade desde o início, não como afterthought.

## 📜 Licença

**MIT** — use, modifique, contribua livremente. Veja [LICENSE](LICENSE).

---

## 🌟 Por que o Intelink existe — e por que grafo muda tudo

### O problema real

Um investigador no Brasil hoje tem acesso a: boletins de ocorrência, consultas de CPF/CNPJ, registros de placa, dados de licitações, dívidas fiscais, antecedentes. O problema não é falta de dado — é que **esses dados estão em 28 sistemas diferentes que não conversam entre si.**

Responder *"essa empresa do meu caso tem algum sócio com ficha no TCU que também ganhou licitação investigada em outra operação?"* significa abrir 5 abas, copiar manualmente, cruzar em planilha. Horas. Às vezes dias.

### O que um ETL faz

**ETL = Extrair, Transformar, Carregar.** É um pipeline automatizado de três passos:

1. **Extrair** — vai até a fonte pública (portal do governo, API, CSV) e baixa os dados
2. **Transformar** — limpa, padroniza, remove duplicatas, cria as conexões entre entidades
3. **Carregar** — grava no banco de grafos como nós e relações permanentes

O Intelink tem **28 ETLs**, cada um cobrindo uma fonte pública brasileira. Juntos, eles populam um grafo com **83 milhões de registros** — todos já conectados entre si.

### Por que grafo e não banco tradicional (SQL)

Em banco relacional, cada "salto" de relação exige um JOIN. A performance cai exponencialmente:

| Pergunta | JOINs | Tempo em SQL | Tempo em grafo |
|---|---|---|---|
| "Quem é essa empresa?" | 1 | Milissegundos | Milissegundos |
| "Quem são os sócios dela?" | 2 | Milissegundos | Milissegundos |
| "Algum sócio tem dívida ativa?" | 3 | Segundos | Milissegundos |
| "Sócio de sócio aparece em CPI?" | 5 | Minutos | Milissegundos |
| "Ligação de até 4 graus entre suspeito e empresa investigada?" | 7+ | Horas ou impossível | **Segundos** |

Em grafo, relações são ponteiros diretos na memória — percorrer 1 salto ou 7 saltos tem o mesmo custo. **A performance não degrada com a profundidade.**

### Isso já funciona no mundo real

**Panama Papers (2016):** 2,6 TB de documentos offshore, 400 jornalistas, 76 países. Com Neo4j: 12 chefes de Estado e governo expostos, PM da Islândia renunciou. Três desenvolvedores construíram o banco em semanas. A editora de dados do consórcio: *"Se ficasse em SQL, encontrar relações entre pessoas e organizações exigiria queries longas e complicadas. No grafo, você segue o fio."*

**Lava Jato — análise acadêmica:** Grafo com 906 pessoas/empresas e 2.693 interações revelou que 8 funcionários (menos de 1% dos nós) eram as pontes que conectavam toda a rede de corrupção. Isso guiou a priorização de alvos — invisível lendo documentos linearmente.

**Caso policial no Reino Unido (2025):** 1,4 TB de dados de 24 celulares apreendidos. *"Ordinariamente levaria meses, se não anos."* Com sistema de grafo: semanas. 6 presos e sentenciados.

### O gap brasileiro

| Sistema existente | O que faz | O que não faz |
|---|---|---|
| ePol (Polícia Federal) | Gestão de inquéritos | Não cruza dados, não tem grafo |
| Córtex (Min. Justiça) | Alertas de placa/CPF | Não analisa redes nem fontes abertas |
| Portal da Transparência | Consulta avulsa | Não cruza fontes, não é investigativo |

Nenhum sistema no Brasil conecta simultaneamente sanções internacionais + patrimônio eleitoral + licitações + CPIs + dívida fiscal + offshore + antecedentes funcionais. O Intelink faz isso sobre 83 milhões de registros, em segundos, open-source.

---

💬 **Dúvidas?** Abra uma [issue](https://github.com/enioxt/intelink/issues) ou entre em contato via [EGOS Discord](https://discord.gg/egos).

🚀 **Vamos construir juntos!**

---

*Parte do [EGOS Framework](https://github.com/enioxt/egos) · Código Sagrado: 000.111.369.963.1618*  
*Made with 💚 in Brazil*
