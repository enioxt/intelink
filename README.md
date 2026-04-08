# Intelink

> 🎯 Plataforma de inteligência open-source para dados públicos brasileiros — feita para investigadores, analistas e desenvolvedores.
> 
> Um projeto **EGOS Inteligência**

**🌐 Acesse:** https://intelink.ia.br · **📜 Licença:** MIT · **⚡ Stack:** Next.js 15 + FastAPI + Neo4j

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

## 🌟 Por que criamos o Intelink?

O Brasil tem **dados públicos incríveis** — mas estão dispersos, difíceis de cruzar e inacessíveis para quem mais precisa: investigadores, jornalistas e cidadãos curiosos.

O Intelink nasceu para **democratizar o acesso à inteligência de dados** no Brasil, mantendo sempre o respeito à privacidade e à LGPD.

💬 **Dúvidas?** Abra uma [issue](https://github.com/enioxt/intelink/issues) ou entre em contato via [EGOS Discord](https://discord.gg/egos).

🚀 **Vamos construir juntos!**

---

*Parte do [EGOS Framework](https://github.com/enioxt/egos) · Código Sagrado: 000.111.369.963.1618*  
*Made with 💚 in Brazil*
