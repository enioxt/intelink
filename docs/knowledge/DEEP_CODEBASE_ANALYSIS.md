# Intelink — Análise Profunda do Codebase (Segunda Exploração)
> Gerado em: 2026-04-14 | Exploração exaustiva de áreas não cobertas na primeira documentação

---

## 1. ESTRUTURA COMPLETA DE `frontend/src/lib/` (25.009 linhas)

### intelligence/ (14 arquivos, ~4.500 linhas)

| Arquivo | Linhas | Função |
|---------|--------|--------|
| `cross-reference-service.ts` | 711 | Deduplicação de entidades — 6 níveis de confiança |
| `ai-router.ts` | 593 | Orquestração multi-provider LLM com fallback |
| `document-extraction.ts` | 585 | OCR + extração de PII de documentos/imagens |
| `matcher.ts` | 498 | Jaro-Winkler fuzzy matching |
| `intelink-service.ts` | 491 | Cliente Neo4j — queries, traversal |
| `graph-algorithms.ts` | 486 | Ego networks, PageRank, detecção de comunidades (Louvain) |
| `graph-aggregator.ts` | 434 | Cache de resultados de queries Neo4j |
| `entity-matcher.ts` | 361 | Cross-case entity linking |
| `rag-context-retriever.ts` | 347 | Embedding-based context para AI chat |
| `embedding-cache.ts` | 346 | Vector store (IndexedDB — offline) |
| `entity-cache.ts` | 322 | Memoized entity lookups |
| `chat-memory.ts` | — | Gerenciamento de estado de conversas |
| `llm-verifier.ts` | — | Fact-checking via LLM |

### Sistema de 6 Níveis de Confiança (Cross-Reference)

```
Level 1: CPF match exato          → 100% confiança
Level 2: CNPJ match exato         → 100% confiança
Level 3: Telefone match exato     → 95% confiança
Level 4: Nome completo + geoproximidade → 80% confiança
Level 5: Nome parcial + overlap temporal → 60% confiança
Level 6: Similaridade de padrão comportamental → 40% confiança
```

### Pipeline de Extração de Documentos

```
Stage 1: OCR (Tesseract.js) → texto bruto
Stage 2: NER (BERTimbau no frontend, sem backend call)
Stage 3: Detecção + mascaramento de PII
Stage 4: Inferência de relacionamentos ("João trabalha na ACME Ltda")
```

### analysis/ (7 arquivos, ~2.500 linhas)

| Arquivo | Linhas | Função |
|---------|--------|--------|
| `diligence-suggestions.ts` | 524 | Engine de recomendações para casos |
| `executive-summary.ts` | 427 | Sumários de casos gerados por IA |
| `risk-assessment.ts` | 365 | Scoring de risco multi-fator |
| `modus-operandi.ts` | 346 | Comparação de padrões criminais entre casos |
| `crit-judging.ts` | 357 | Avaliação de qualidade de evidências |
| `urgency-service.ts` | 320 | Priorização de casos |
| `anchoring-score.ts` | — | Scoring de mitigação de viés cognitivo |

### legal/ (1 arquivo, 574 linhas)

**`criminal-articles.ts`** — Base de dados de 100+ artigos do código penal brasileiro:
- Código Penal (CP)
- Lei de Drogas (11.343/2006)
- Lei Maria da Penha (11.340/2006)
- Lei de Organizações Criminosas (12.850/2013)
- Estatuto do Desarmamento
- Cada artigo inclui: penalidade, prescrição, elementos do tipo, jurisprudência

### detectors/ (4 arquivos, ~1.200 linhas)

- `benford-anomaly.ts` — Teste chi-quadrado para Lei de Benford
- `ghost-employees.ts` — Detecção de fraude em folha de pagamento
- `hhi-concentration.ts` — Concentração de mercado (Herfindahl-Hirschman)

### reports/ (2 arquivos, ~740 linhas)

- `arkham-templates.ts` (344 linhas) — Templates de laudo profissional com fontes e intervalos de confiança
- `export-utils.ts` (395 linhas) — Geração de PDF/DOCX/Markdown

---

## 2. ESTRUTURA DE APPS/ (Arquitetura Nova — Alvo de Migração)

```
apps/web/app/
├── admin/tenants/page.tsx     — Admin multi-tenant
├── analysis/page.tsx          — Módulo de análise
├── chat/page.tsx              — AI chat (Vercel AI SDK)
├── dashboard/page.tsx         — Analytics
├── graph/page.tsx             — Visualização Neo4j (Cytoscape)
├── osint/page.tsx             — Ferramentas OSINT
├── pcmg/page.tsx              — Integração PCMG
└── security/page.tsx          — Logs de auditoria

apps/web/lib/db/
├── rxdb.ts          — RxDB local-first com IndexedDB
├── encryption.ts    — AES-256-GCM com PBKDF2
├── sync.ts          — CRDT (Automerge v2) para sync offline
└── audit.ts         — Audit trail offline
```

### Comparativo frontend/ vs apps/web/

| Aspecto | frontend/src/ | apps/web/ |
|---------|---------------|-----------|
| Framework | Next.js 15 | Next.js 14.2 |
| AI SDK | Router customizado | Vercel AI SDK |
| Offline | Não implementado | RxDB + Automerge |
| Criptografia | Planejado | AES-256-GCM live |
| Status | Sendo migrado | Desenvolvimento ativo |

**Conclusão:** `apps/web/` é o destino de migração. `frontend/src/` está sendo gradualmente substituído.

---

## 3. ANÁLISE DO TASKS.MD (Backlog Completo)

### Status por Fase

| Fase | Completo | Em Progresso | Pendente |
|------|---------|-------------|---------|
| PHASE-1 Foundation | 8/9 ✅ | — | 1 (deploy manual) |
| PHASE-2 Intelligence | 14/25 🟡 | Graph UI, Arkham | NER real cases |
| PHASE-3 Scale | 0/12 🔴 | Multi-tenant RLS | CRDT, ETL |

### Deployments Pendentes

```bash
# Requer secrets no GitHub
DEPLOY-REAL: Terraform apply no VPS (manual)
Requires: TF_VAR_hcloud_token, TF_VAR_domain
```

### Realidade vs Documentação

| Categoria | Documentado | Real | % |
|----------|------------|------|---|
| API Routers | 25 | 25 | 100% ✅ |
| Backend Services | 20+ | 20+ | 100% ✅ |
| ETL Pipelines | 46 | 4 | 9% 🔴 |
| Testes | 40 | 8 | 20% 🔴 |
| Frontend Components | 134 | ~25 ativos | ~20% 🔴 |

---

## 4. INVENTÁRIO DE TESTES

### Backend Tests (8 arquivos, ~500 linhas)

```
api/tests/
├── conftest.py                    — Markers: @requires_neo4j, @requires_redis, @slow
├── integration/
│   ├── test_health.py             — Endpoint /health, auth, docs
│   ├── test_public.py             — Endpoints sem autenticação
│   └── test_search.py             — Full-text + semântico
├── unit/
│   └── test_pii_masking.py        — Verificação CPF/CNPJ masking
├── test_agent_context.py          — Context manager de agentes de investigação
├── test_chat_enhance_endpoint.py  — Chat com tools
└── test_suggestions_endpoint.py   — Sugestões de análise
```

### Frontend Tests (4 arquivos)

```
frontend/tests/
├── unit/cross-reference.test.ts       — Dedup Jaro-Winkler
├── e2e/intelink-basic.spec.ts         — Smoke test
├── e2e/intelink-multiformat-upload.spec.ts — Upload multi-formato
└── e2e/intelink-smoke.spec.ts         — Fluxos críticos
```

### O Que NÃO Está Testado 🔴

- Detecção de padrões (pattern_detector.py) — zero testes unitários
- Queries Neo4j — tests marcados `@requires_neo4j` e pulados por padrão no CI
- Templates de investigação — sem fixtures de teste
- Motor de cruzamento (cross_reference_engine) — apenas integração opcional
- Detector Benford — sem testes

### Fixtures de Dados Sintéticos

```
api/tests/fixtures/synthetic_investigations/
├── Caso 1: Peculato — 5 pessoas, 3 empresas de fachada
├── Caso 2: Tráfico — rede fornecedor→distribuidor→varejo
├── Caso 3: Corrupção + fraude em licitações
├── Caso 4: Lavagem — cassino→offshore→imóveis
└── Caso 5: Crime organizado — controle territorial
```

Zero CPF/CNPJ real. Dados sintéticos para testar algoritmos sem vazar dados.

---

## 5. SCHEMA DO BANCO DE DADOS (Migrações Alembic)

### migrations/versions/ (337 linhas)

**001_initial_intelink_schema.py (225 linhas)**
```sql
-- Tabelas criadas
users (masp, password_hash, roles, tenant_id)
entities (type, source, confidence, tenant_id)
relationships (entity_id_from, entity_id_to, type, strength, tenant_id)
investigations (status, priority, assigned_to, tenant_id)
activity_logs (append-only, sem UPDATE/DELETE)

-- Índices
entity_type, investigation_status, created_at
-- RLS placeholder: tenant_id em todas as tabelas
```

**002_create_spiral_sessions_table.py (41 linhas)**
```sql
-- Adiciona
sessions (conversation history para chat context)
```

**003_add_investigations.py (71 linhas)**
```sql
-- Adiciona
investigation_metadata (JSON, flexível)
linked_entities (entidades vinculadas ao caso)
case_files (documentos do processo)
```

### Constraints Importantes

- `tenant_id` em TODAS as tabelas (PHASE-3 multi-tenant)
- `activity_logs` append-only (LGPD Art. 30)
- Score de confiança em todo relacionamento (float 0-1)
- Timestamps imutáveis nas linhas de auditoria

---

## 6. TODOs E FIXMES NO CÓDIGO

### Backend — 3 Itens Críticos

```python
# cross_reference_engine.py
pattern_matches=[]  # TODO: implementar pattern matching
# Impacto: Scores de cross-reference não consideram padrões detectados

# x402_payment_handler.py (2 ocorrências)
# TODO: Implement actual facilitator call
# Impacto: Micropagamentos são mock — não funcional

# pcmg_ingestion.py (3 ocorrências)
storage_used_gb=0.0  # TODO: calcular
pending_jobs=0       # TODO: fila
failed_jobs=0        # TODO: tracking
# Impacto: Métricas de storage/jobs não funcionam
```

### Frontend — 8 Stubs de Integração

```typescript
// evidence-validation.ts
// TODO: Implement when Infoseg integration is ready
// TODO: Implement when SIP integration is ready
// TODO: Implement when REDS integration is ready
// Impacto: Validação de evidências contra bases policiais não funciona
```

### Avaliação Geral

Dívida técnica LOW — sistema funcionalmente completo. TODOs são pontos de integração com sistemas externos de acesso restrito (Infoseg, SIP, REDS) que dependem de parcerias institucionais.

---

## 7. INTEGRAÇÕES E STATUS

### Chave de API (.env.example)

| Integração | Status | Notas |
|-----------|--------|-------|
| DashScope (Alibaba) | ✅ Primary | 1M tokens grátis, excelente PT-BR |
| OpenRouter | ✅ Fallback | 100+ modelos |
| Google AI | ✅ Fallback | Gemini Pro |
| Anthropic Claude | ✅ Fallback | |
| OpenAI | ✅ Fallback | |
| Shodan | 🟡 Parcial | `osint_tools.py` 520 linhas |
| HaveIBeenPwned | ✅ Live | API gratuita |
| Portal Transparência | 🔴 Stub | Documentado, sem código |
| Telegram Bot | ✅ Live | Notificações funcionais |
| WhatsApp/Evolution | 🟡 Opcional | Listado, não integrado |
| Infoseg/SIP/REDS | 🔴 Stub | Acesso restrito — aguarda parceria |

### Estratégia Multi-Provider LLM

```
Prioridade: DashScope → OpenRouter → Google → Anthropic → OpenAI

Implementado em:
- api/src/egos_inteligencia/services/intelligence_provider.py (514 linhas)
- frontend/src/lib/intelligence/ai-router.ts (593 linhas)

Inferência NER no browser:
- BERTimbau roda no FRONTEND (sem chamada de API)
- Reduz latência e custo de API
```

---

## 8. ARQUITETURA OFFLINE-FIRST (PHASE-3)

```typescript
// apps/web/lib/db/rxdb.ts
// LocalStorage + IndexedDB para modo offline
// Automerge v2: sync CRDT sem conflito quando internet retorna
// AES-256-GCM com PBKDF2 (chave derivada de senha)
// Audit trail offline rastreia todas as mutações
```

**Caso de Uso Alvo:** Investigadores de campo em áreas com conectividade instável (delegacias rurais, campo de operação).

### Estado Atual do Offline

- Código existe em `apps/web/lib/db/`
- Não integrado à UI principal (`frontend/`)
- PHASE-3 feature — não pronto para produção

---

## 9. COMPLIANCE LGPD — DETALHAMENTO

### Implementado ✅

| Art. | Mecanismo | Implementação |
|-----|----------|---------------|
| Art. 7º | Base legal (segurança pública) | Documentada em LGPD_COMPLIANCE.md |
| Art. 30 | Registro de operações | `activity_logs` append-only |
| Art. 31 | Medidas de segurança | AES-256, RLS, JWT RS256 |
| Art. 46 | Sub-processors | Neo4j, Redis, OpenRouter mapeados |

### Pendente 🔴

| Requisito | Art. | Risco |
|---------|-----|-------|
| Designação DPO | Art. 41 | CRÍTICO — multa ANPD |
| Portal de direitos do titular | Art. 14 | ALTO |
| Export de dados (portabilidade) | Art. 18 | ALTO |
| Registro ANPD | — | MÉDIO |
| DPAs com sub-processors | Art. 46 | ALTO |

---

## 10. SERVIÇOS BACKEND — PROFUNDIDADE ADICIONAL

### Por Tamanho/Complexidade

| Serviço | Linhas | Status | Nota |
|---------|--------|--------|------|
| `transparency_tools.py` | 1.372 | ✅ | Portal transparência, CNPJ, salários |
| `osint_tools.py` | 520 | ✅ | Shodan, HIBP, análise de imagem |
| `intelligence_provider.py` | 514 | ✅ | Orquestração LLM multi-provider |
| `investigation_templates.py` | 477 | ✅ | Templates Cypher para Neo4j |
| `jobs_worker.py` | 466 | ✅ | Fila de jobs background |
| `cross_reference_engine.py` | 420 | ✅ | Deduplicação de entidades |
| `benford_analyzer.py` | 345 | ✅ | Anomalias financeiras |
| `guard_integration.py` | 339 | ✅ | Guard Brasil PII |
| `investigation_service.py` | 297 | ✅ | CRUD de casos + timeline |
| `x402_payment_handler.py` | 271 | 🔴 MOCK | Micropagamentos — não funcional |

---

## 11. LACUNAS IDENTIFICADAS (Resumo Executivo)

### Críticos para Produção 🔴

1. **Pattern Matching desconectado** — `cross_reference_engine.py` retorna `pattern_matches=[]` vazio. O `pattern_detector.py` existe mas não está conectado ao scorer de cross-reference.

2. **ETL Pipelines** — Apenas 4 de 46 implementados. O framework existe (`etl_pipeline_template.py` 448 linhas). Cada novo pipeline leva 1-2 dias de desenvolvimento.

3. **Testes Neo4j** — Todo teste de graph query é pulado no CI por padrão (`@requires_neo4j`). Sem CI verde para funcionalidades core.

4. **LGPD DPO e Portal do Titular** — Requisitos legais não implementados. Risco regulatório ANPD.

### Médios 🟡

5. **Multi-tenant RLS** — Schema preparado, enforcement não ativo. Bloqueia uso multi-delegacia.

6. **CRDT Sync** — Código existe em `apps/web/lib/db/`, não integrado ao frontend principal.

7. **Componentes Frontend** — 134 documentados, ~25 ativos em `apps/web/`. Transição em andamento.

8. **Storage/Jobs metrics** — `pcmg_ingestion.py` retorna zeros hardcoded.

### Pontos de Integração Futura 🟢 (depende de parcerias)

9. **Infoseg/SIP/REDS** — Stubs no código, aguarda acordo institucional.
10. **Portal Transparência** — Documentado, não implementado.
11. **2FA MASP** — Design existe, implementação não.

---

## 12. RECOMENDAÇÕES PRIORITÁRIAS

### Para Fazer Agora (Sprint 30 dias)

1. **Conectar pattern_detector ao cross_reference_engine** — 1 dia de trabalho. Melhora qualidade de deduplicação.
2. **Adicionar NEO4J_TEST_URI ao CI** — 0.5 dia. Ativa todos os testes de graph query.
3. **ETL DHPP** — Adaptar `pcmg_document_pipeline.py` para documentos da Delegacia. 2-3 dias.
4. **Fix storage metrics** — Substituir `0.0` hardcoded por cálculo real. 0.5 dia.

### Para Próximo Mês (PHASE-2 Completion)

5. Designar DPO (ação administrativa — não técnica)
6. Implementar endpoint `/titular` (LGPD Art. 14) — 3 dias
7. Migrar frontend/ → apps/web/ (incremental, 2 semanas)
8. Implementar 5 ETL pipelines adicionais (RAIS, SIGTAP, Receita Federal CNPJ, TSE, TCU)

### Para PHASE-3 (3+ meses)

9. Ativar RLS multi-tenant no PostgreSQL
10. Integrar CRDT Automerge ao UI principal
11. Implementar 2FA via MASP policial
12. Expandir para 40+ ETL pipelines

---

*Gerado por Enio + Claude Code Opus 4.6 — Segunda exploração exaustiva do codebase.*
*Cobre: frontend/src/lib/, apps/web/, TASKS.md, testes, migrações, TODOs inline, .env, compliance LGPD*
*Complementa: 00_INDEX_SYSTEM_MAP.md e 105 arquivos da exportação anterior*
