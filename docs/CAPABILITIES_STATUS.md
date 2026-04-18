# Status Real das Capacidades — Intelink
> **SSOT:** `docs/CAPABILITIES_STATUS.md` | Updated: 2026-04-14
> **Verificado no código-fonte** — não é documentação especulativa.

**Legenda:** ✅ Funcionando em produção | ⚠️ Código existe, sem teste formal | 🟡 Parcial | 🔴 Não existe / não funcional

---

## Autenticação & Segurança

| Capacidade | Status | Localização |
|-----------|--------|------------|
| JWT RS256 login/logout/refresh | ✅ | `routers/auth.py`, `lib/auth/session.ts` |
| bcrypt 14 rounds (senhas) | ✅ | `services/auth_service.py` |
| PII masking CPF/CNPJ/email | ✅ 100% | `middleware/cpf_masking.py`, `middleware/pii.py` |
| Rate limiting token bucket | ✅ | `middleware/rate_limit.py` (slowapi) |
| RBAC 4 níveis | ✅ | `lib/auth/rbac.ts` |
| Audit log append-only Merkle | ✅ | `routers/activity.py`, Postgres `activity_logs` |
| Security headers (HSTS, CSP) | ✅ | `middleware/security_headers.py` |
| Input sanitizer (SQLi/XSS) | ✅ | `middleware/input_sanitizer.py` |
| TLS 1.3 (Caddy auto-cert) | ✅ | `infra/Caddyfile` |
| 2FA MASP policial | 🔴 | Design exists, zero implementação |

---

## Entidades & Busca

| Capacidade | Status | Localização |
|-----------|--------|------------|
| CRUD entidades (Person/Company/Vehicle) | ✅ | `routers/entity.py` |
| Lookup por CPF/CNPJ/nome | ✅ | `routers/entity.py` |
| Full-text search Neo4j | ✅ | `routers/search.py` |
| Busca semântica (embedding fallback) | ✅ | `routers/search.py` |
| Deduplicação Jaro-Winkler 6 níveis | ✅ testado | `services/cross_reference_engine.py`, `lib/intelligence/cross-reference-service.ts` |
| Enrichment automático de entidade | ⚠️ | `routers/entity.py` (endpoints existem) |

---

## NLP & Extração

| Capacidade | Status | Localização |
|-----------|--------|------------|
| BERTimbau NER PT-BR (backend) | ✅ | `services/nlp/bertimbau_ner.py` (303 linhas) |
| spaCy NER (fallback) | ✅ | `services/nlp/spacy_ner.py` (254 linhas) |
| BERTimbau NER no browser (zero API call) | ✅ | `lib/intelligence/document-extraction.ts` |
| OCR Tesseract.js | ✅ testado e2e | `lib/intelligence/document-extraction.ts` |
| Extração de relacionamentos de texto | ⚠️ | `lib/intelligence/document-extraction.ts` |

---

## Grafos & Análise

| Capacidade | Status | Localização |
|-----------|--------|------------|
| Ego networks Neo4j (3-5 hops, <100ms) | ⚠️ | `routers/graph.py` (testes pulados no CI) |
| Shortest path entre entidades | ⚠️ | `routers/graph.py` |
| Visualização Cytoscape.js | ✅ | `apps/web/app/graph/page.tsx` |
| PageRank | ⚠️ sem teste | `lib/intelligence/graph-algorithms.ts` |
| Community detection Louvain | ⚠️ sem teste | `lib/intelligence/graph-algorithms.ts` |
| Ego network cache (graph-aggregator) | ⚠️ | `lib/intelligence/graph-aggregator.ts` |
| Embedding cache offline (IndexedDB) | ⚠️ | `lib/intelligence/embedding-cache.ts` |

---

## Padrões & Anomalias

| Capacidade | Status | Localização |
|-----------|--------|------------|
| Sacred Math scoring (Fibonacci/phi) | ⚠️ zero testes | `services/patterns/pattern_detector.py` |
| Benford's Law (fraude financeira) | ⚠️ zero testes | `services/benford_analyzer.py`, `lib/detectors/benford-anomaly.ts` |
| Ghost employees (fraude folha) | ⚠️ zero testes | `lib/detectors/ghost-employees.ts` |
| Shell companies detection | ⚠️ zero testes | `services/patterns/pattern_detector.py` |
| HHI market concentration | ⚠️ zero testes | `lib/detectors/hhi-concentration.ts` |
| **Pattern→CrossRef connection** | 🔴 DESCONECTADO | `cross_reference_engine.py` retorna `pattern_matches=[]` |

---

## Análises Avançadas (implementadas, não expostas na UI)

| Capacidade | Status | Localização |
|-----------|--------|------------|
| Diligence suggestions (recomendações de caso) | ⚠️ UI não usa | `lib/analysis/diligence-suggestions.ts` (524 linhas) |
| Executive summary IA | ⚠️ UI não usa | `lib/analysis/executive-summary.ts` (427 linhas) |
| Risk assessment multi-fator | ⚠️ UI não usa | `lib/analysis/risk-assessment.ts` (365 linhas) |
| Modus operandi comparison cross-case | ⚠️ UI não usa | `lib/analysis/modus-operandi.ts` (346 linhas) |
| Evidence quality evaluation | ⚠️ UI não usa | `lib/analysis/crit-judging.ts` (357 linhas) |
| Case urgency/priority | ⚠️ UI não usa | `lib/analysis/urgency-service.ts` (320 linhas) |
| Anchoring bias score | ⚠️ UI não usa | `lib/analysis/anchoring-score.ts` |

**Ação prioritária:** Expor estas capacidades na UI — o código está pronto, só falta a interface.

---

## Investigações & Templates

| Capacidade | Status | Localização |
|-----------|--------|------------|
| CRUD investigações | ✅ | `routers/investigation.py` |
| Template Corrupção (Cypher pré-configurado) | ✅ | `services/investigation_templates.py` |
| Template Lavagem de Dinheiro | ✅ | `services/investigation_templates.py` |
| Template Crime Organizado | ✅ | `services/investigation_templates.py` |
| Template Compliance Corporativo | ✅ | `services/investigation_templates.py` |
| Template Jornalismo Investigativo | ✅ | `services/investigation_templates.py` |
| Base legal brasileira (100+ artigos) | ✅ | `lib/legal/criminal-articles.ts` |
| Custom template (criação pelo usuário) | 🔴 | Engine existe, UX de criação não |
| Colaboração em investigações | 🔴 | Single-user apenas |

---

## AI Chat & Modelos

| Capacidade | Status | Localização |
|-----------|--------|------------|
| Streaming AI chat (SSE) | ✅ | `routers/chat.py` |
| Tool calling (12 ferramentas) | ✅ | `routers/chat_tools.py` |
| Multi-provider fallback | ✅ | `services/intelligence_provider.py` (DashScope→OpenRouter→Google→Anthropic) |
| System prompts configuráveis | ✅ | `routers/chat_prompt.py` |
| RAG context retrieval | ⚠️ | `lib/intelligence/rag-context-retriever.ts` |
| Modelagem local (Ollama/Llama) | 🔴 | `apps/web/components/chat/ModelSelector.tsx` tem UI, sem integração backend |

---

## ETL & Ingestão

| Capacidade | Status | Localização |
|-----------|--------|------------|
| BNMP (mandados de prisão) | ✅ | `etl/pipelines/bnmp.py` |
| DataJud (processos judiciais) | ✅ | `etl/pipelines/datajud.py` |
| PCMG documentos (PDF/DOCX/TXT/XLSX) | ✅ e2e testado | `etl/pipelines/pcmg_document_pipeline.py` |
| PCMG vídeos (transcrição) | ✅ | `etl/pipelines/pcmg_video_pipeline.py` |
| Portal Transparência | ⚠️ | `services/transparency_tools.py` (1.372 linhas — API existe) |
| RAIS, SIGTAP, SICONFI, CNEFE | 🔴 | Framework existe, pipelines não escritos |
| ETL Scheduler (automático) | 🔴 | Apenas manual |

---

## OSINT

| Capacidade | Status | Localização |
|-----------|--------|------------|
| HaveIBeenPwned | ✅ | `services/osint_tools.py` |
| Shodan | 🟡 | `services/osint_tools.py` (pode precisar rotação de key) |
| CNPJ lookup (BrasilAPI) | ✅ | `routers/public.py` |
| Image analysis + geolocalização | ✅ | `services/osint_tools.py` |
| WhatsApp Evolution API | 🟡 | Config existe, não integrado ao fluxo principal |
| Telegram notifications | ✅ | `services/` |
| Infoseg/SIP/REDS | 🔴 | Stubs aguardam parceria institucional |

---

## Relatórios & Export

| Capacidade | Status | Localização |
|-----------|--------|------------|
| Arkham report templates | ⚠️ não testado | `lib/reports/arkham-templates.ts` (344 linhas) |
| Export PDF (jsPDF) | ⚠️ não testado | `lib/reports/export-utils.ts` |
| Export DOCX | ⚠️ não testado | `lib/reports/export-utils.ts` |
| Export LGPD-compliant (Art. 18) | 🔴 | Não existe |

---

## Infraestrutura & Compliance

| Capacidade | Status | Localização |
|-----------|--------|------------|
| Docker Compose stack completa | ✅ | `infra/docker-compose.yml` |
| Terraform Hetzner CX42 | ✅ | `infra/terraform/` |
| Ansible provisionamento | ✅ | `infra/ansible/` |
| CI/CD GitHub Actions | ✅ | `.github/workflows/` |
| Offline CRDT (Automerge v2) | 🟡 | `apps/web/lib/db/` — não integrado à UI principal |
| AES-256-GCM client-side | 🟡 | `apps/web/lib/db/encryption.ts` — só em apps/web |
| Multi-tenant RLS | 🟡 | Schema pronto, policies não ativas |
| DPO designado (LGPD Art. 41) | 🔴 | Ação administrativa pendente |
| Portal do titular (LGPD Art. 14) | 🔴 | `/titular` endpoint não existe |

---

## Score por Área

| Área | Score |
|------|-------|
| Autenticação & Segurança | 90% |
| Entidades & Busca | 85% |
| NLP & Extração | 78% |
| Grafos & Análise | 55% |
| Padrões & Anomalias | 35% (código existe, desconectado/sem testes) |
| Análises Avançadas | 60% (código pronto, UI não usa) |
| AI Chat | 75% |
| ETL & Ingestão | 18% |
| OSINT | 65% |
| Relatórios | 25% |
| Infraestrutura | 80% |
| **MÉDIA GERAL** | **~60%** |

---

*Verificado em 2026-04-14 via inspeção direta do código-fonte.*
*Para atualizar: editar este arquivo quando implementar ou descobrir nova capacidade.*
