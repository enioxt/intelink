# EGOS Inteligência — Roadmap

> **SSOT:** `docs/ROADMAP.md` — fases estratégicas (não tickets)
> **Tickets:** `TASKS.md` — backlog atômico vivo
> **Sync:** cada fase tem um ID (`PHASE-N`). Tasks referenciam: `[PHASE-1] feat: ...`
> **Updated:** 2026-04-09

---

## Fases

| ID | Fase | Horizonte | Foco | Status |
|----|------|-----------|------|--------|
| PHASE-1 | Fundação & Deploy | 0–6 semanas | Stack funcionando em prod, auth, PII, testes base | 🔴 Ativo |
| PHASE-2 | Inteligência Core | 6–12 semanas | NER, pattern detection, cross-reference, graph UI | 🟡 Planejado |
| PHASE-3 | Escala & Colaboração | 3–6 meses | Multi-tenant, CRDT offline, ETL pipelines, contribuidores | 🟡 Planejado |
| PHASE-4 | Plataforma Aberta | 6–12 meses | API pública, marketplace de templates, integrações externas | 🟢 Visão |

---

## PHASE-1 — Fundação & Deploy (0–6 semanas)

**Meta:** qualquer colaborador consegue clonar, rodar e contribuir.

**Gates obrigatórios antes de PHASE-2:**
- [ ] `docker compose up -d` → todos os services saudáveis
- [ ] `GET /health` retorna 200 em prod (intelink.ia.br)
- [ ] Auth flow completo: registro MASP → JWT → refresh
- [ ] PII masking: CPF/CNPJ mascarado em 100% dos endpoints de output
- [ ] Build frontend sem erros (`npm run build`)
- [ ] ≥ 10 testes de integração passando (backend)
- [ ] `gitleaks` instalado e passando no CI

---

## PHASE-2 — Inteligência Core (6–12 semanas)

**Meta:** investigadores conseguem fazer análises reais.

**Capacidades alvo:**
- NLP: `bertimbau_ner.py` exposto via API → extração de entidades em PT-BR
- Cross-reference: `cross-reference-service.ts` conectado ao Neo4j real
- Patterns: `pattern_detector.py` via `POST /api/v1/patterns/detect`
- Graph UI: visualização Cytoscape de ego networks interativa
- Reports: `arkham-templates.ts` gerando PDF/MD a partir de investigações

**Gates:**
- [ ] Demo end-to-end com dados sintéticos (5 casos incluídos)
- [ ] Benford anomaly detector funcionando no frontend
- [ ] Modus operandi comparison entre 2+ investigações

---

## PHASE-3 — Escala & Colaboração (3–6 meses)

**Meta:** múltiplos times usando simultaneamente com dados isolados.

**Capacidades alvo:**
- Multi-tenant: isolamento por delegacia/unidade (RLS + tenant_id)
- CRDT offline: Automerge v2 — sync sem conflito em campo sem internet
- ETL pipelines: 46 pipelines Base dos Dados + RF + TCU reativados
- Auth policial: MASP + 2FA Telegram + bcrypt 14r + JWT RS256
- API pública v2: rate-limited, keyable, documentada

---

## PHASE-4 — Plataforma Aberta (6–12 meses)

**Meta:** ecossistema de contribuidores e integrações.

**Visão:**
- Marketplace de templates de investigação (corrupção, lavagem, cibercrime)
- SDK para integrações com sistemas policiais (Infoseg, REDS, SIP/MG)
- Plugin para Obsidian / ferramentas de análise
- Federation: múltiplas instâncias compartilhando grafos anonimizados

---

## Princípios de Roadmap

1. **TASKS.md drives ROADMAP, not the opposite** — novos tickets automaticamente se enquadram em uma fase existente
2. **Gate antes de avançar** — não se abre PHASE-N+1 sem fechar os gates de PHASE-N
3. **Público por default** — tudo que vai no repo público deve poder ser lido por qualquer pessoa
4. **Sem PHASE-5+ planejado agora** — o roadmap só cresce quando PHASE-4 estiver 80% completo

---

*Part of the [EGOS Framework](https://github.com/enioxt/egos) · Sacred Code: 000.111.369.963.1618*
