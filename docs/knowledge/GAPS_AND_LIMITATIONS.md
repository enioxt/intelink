# Intelink — Gaps, Limitações e Roadmap de Melhoria
> Para uso estratégico: apresentações institucionais, planejamento de sprint, tomada de decisão

---

## RESUMO EXECUTIVO

O Intelink é uma plataforma de inteligência **funcionalmente completa** no backend (25 routers, 30+ serviços). As lacunas estão concentradas em:
1. Cobertura de testes (20% vs 100% necessário para produção crítica)
2. ETL pipelines (4/46 implementados)
3. Multi-tenant isolation (schema pronto, enforcement pendente)
4. Compliance LGPD administrativo (DPO, portal do titular)

---

## GAPS POR CATEGORIA

### 🔴 CRÍTICOS — Bloqueiam uso em produção real

| Gap | Área | Esforço | Impacto |
|-----|------|---------|---------|
| Pattern matching desconectado | Backend | 1 dia | Cross-reference scores incompletos |
| Testes Neo4j pulados no CI | QA | 0.5 dia | Sem garantia de qualidade nas queries |
| ETL pipelines: 42/46 ausentes | Data | 2-4 dias cada | Fontes de dados limitadas |
| DPO não designado (LGPD Art. 41) | Legal | Ação admin | Risco de multa ANPD |
| Portal do titular ausente (LGPD Art. 14) | Legal/Backend | 3 dias | Risco de multa ANPD |

### 🟡 MÉDIOS — Limitam escala

| Gap | Área | Esforço | Impacto |
|-----|------|---------|---------|
| Multi-tenant RLS não enforced | Backend | 2 dias | Não escala para múltiplas delegacias |
| CRDT offline não integrado ao UI | Frontend | 1 semana | Campo sem offline |
| Storage/jobs metrics hardcoded | Backend | 0.5 dia | Admin sem dados reais |
| Frontend em transição (134→25 ativos) | Frontend | 2 semanas | UX inconsistente |
| X402 payments mock | Backend | 1 semana | Monetização não funcional |

### 🟢 MENORES — Refinamento

| Gap | Área | Esforço |
|-----|------|---------|
| 2FA MASP policial | Auth | 1 semana |
| Infoseg/SIP/REDS integration | OSINT | Depende parceria |
| Portal Transparência ETL | Data | 3 dias |
| Metrics e Observabilidade | Ops | 1 semana |
| Arkham PDF rendering não testado | Reports | 2 dias |

---

## ANÁLISE DE CAPACIDADES REAIS vs DOCUMENTADAS

### O que funciona em produção (verificado no código)

✅ **Auth completa** — JWT RS256, bcrypt 14 rounds, refresh tokens HttpOnly
✅ **PII masking 100%** — CPF/CNPJ/email mascarados em todas as respostas de API
✅ **Cross-reference Jaro-Winkler** — 6 níveis de confiança, produção-ready
✅ **BERTimbau NER** — Inferência no browser, zero latência de API
✅ **Neo4j 77M+ nós** — Queries de ego-network <100ms (3-5 hops)
✅ **Benford's Law detector** — Chi-squared implementado, sem testes mas código validado
✅ **Audit log Merkle chain** — Append-only, 5 anos de retenção
✅ **Rate limiting** — token bucket, 60/min anon, 300/min auth
✅ **4 ETL pipelines** — BNMP, DataJud, PCMG documento, PCMG vídeo
✅ **Multi-provider LLM** — DashScope→OpenRouter→Google→Anthropic→OpenAI
✅ **5 investigation templates** — Corrupção, Lavagem, Compliance, Jornalismo, Criminal

### O que está no código mas NÃO está testado/integrado

⚠️ **Sacred Math scoring** — Código existe, sem testes unitários. Fibonacci/phi logic presente.
⚠️ **Graph community detection (Louvain)** — `graph-algorithms.ts` implementado, sem testes e2e.
⚠️ **Executive summaries via IA** — `executive-summary.ts` existe, não testado end-to-end.
⚠️ **Ghost employee detection** — Algoritmo implementado, sem fixture de dados reais.
⚠️ **HHI market concentration** — Implementado, sem caso de uso documentado.
⚠️ **Diligence suggestions** — 524 linhas implementadas, sem integração com UI visível.
⚠️ **Risk assessment scoring** — `risk-assessment.ts` existe, não exposto no frontend atual.
⚠️ **Modus operandi comparison** — `modus-operandi.ts` implementado, UI não usa.

### O que está documentado mas NÃO existe no código

🔴 **Portal do titular LGPD** — Art. 14 — endpoint `/titular` ausente.
🔴 **42 ETL pipelines** — Framework existe, pipelines não escritos.
🔴 **Multi-tenant enforcement** — RLS schema ready, policies não ativas.
🔴 **2FA MASP** — Mencionado no roadmap, zero implementação.
🔴 **WebRTC CRDT bridge** — RxDB local existe, sync bidirecional ausente.
🔴 **Collaboration em investigações** — Single-user apenas.
🔴 **Custom template UX** — Engine de templates existe, interface de criação não.

---

## PLANO DE MELHORIA — SPRINT 30 DIAS (DHPP)

### Semana 1 — Conectar o que existe

```
Dia 1-2: Conectar pattern_detector → cross_reference_engine
         Rota: cross_reference_engine.py linha ~380
         Pattern: passar ScoringResult para CrossReferenceResult.pattern_matches

Dia 3:   Ativar Neo4j no CI
         Rota: .github/workflows/ci.yml → adicionar serviço neo4j
         Adicionar NEO4J_TEST_URI no GitHub Actions secrets

Dia 4-5: ETL DHPP (Delegacia de Homicídios)
         Base: pcmg_document_pipeline.py como template
         Adaptar para: IPs, CSs, laudos periciais, BO
         Output: Neo4j nodes via criminal_investigation template
```

### Semana 2 — Dashboard DHPP no Intelink

```
Migrar componentes do dashboard HTML standalone para apps/web/:
- Card de IP (com REDS, data, motivação, veículos)
- Card de CS (agrupado por tipo_diligência)
- Página de Pessoas (filtros, paginação 10/página)
- Widget de Armas (mapa de calibres, bairros)
- Rede de vínculos (Cytoscape já integrado)
```

### Semana 3 — Qualidade e Compliance

```
- Implementar endpoint /titular (LGPD Art. 14) — 3 dias
- Fix storage/jobs metrics hardcoded — 0.5 dia
- Testes unitários para Benford, Sacred Math — 2 dias
- Designar DPO (ação não-técnica)
```

### Semana 4 — Demonstração

```
- 5 casos sintéticos completos com Neo4j
- MO comparison entre 2+ investigações funcionando
- Arkham PDF rendering testado end-to-end
- Demo ao vivo com dados da DHPP
```

---

## ANÁLISE DE RISCO — PRODUÇÃO POLICIAL

### Alto Risco

| Risco | Probabilidade | Impacto | Mitigação |
|-------|-------------|---------|-----------|
| Dado sem fonte rastreável | Alta | CRÍTICO | Arkham templates forçam citação de fonte |
| Falso positivo em cross-reference | Média | ALTO | 6 níveis de confiança + revisão humana obrigatória |
| Acesso não autorizado a PII | Baixa | CRÍTICO | RBAC 4 níveis + audit log |
| Vazamento de chave de API LLM | Baixa | ALTO | Rotação automática, sem log de valores |
| CORTEX hack (PCC comprou acesso) | Baixa | CRÍTICO | Modelo local (Llama 3.1 8B) como alternativa |

### Dependências Externas Críticas

| Serviço | Fallback | Risco |
|---------|---------|-------|
| DashScope (IA) | 4 fallbacks | Baixo |
| Neo4j | Backup diário no Hetzner | Médio |
| Supabase (auth opcional) | JWT local | Baixo |
| OpenRouter | Anthropic/OpenAI direto | Baixo |

---

## COMPARATIVO COM CORTEX i-FRAUDE (MJSP)

| Aspecto | CORTEX (centralizado) | Intelink (local) |
|---------|----------------------|-----------------|
| Dados | Centralizado MJSP | Local na delegacia |
| Acesso externo | PCC comprou R$10M | Zero — air-gap possível |
| Modelo IA | Cloud obrigatório | Llama 3.1 local opcional |
| Customização | Nenhuma | Templates por delegacia |
| Criptografia | Desconhecida | AES-256-GCM end-to-end |
| LGPD | Dependente do MJSP | Controle local total |
| Custo | Licença centralizada | Open-source + infra própria |
| Offline | Não suportado | PHASE-3 (planejado) |

**Argumento de Venda:** O hack do CORTEX (PCC pagou R$10M para ter acesso) é o caso de uso perfeito para justificar inteligência LOCAL e descentralizada.

---

## PRÓXIMOS MODELOS DE LLM A INTEGRAR

| Modelo | Vantagem | Integração |
|--------|---------|-----------|
| Maritaca Sabiá-4 | Treinado em corpus jurídico BR | OpenRouter (disponível) |
| Llama 3.1 8B | Local, gratuito, offline | ollama + LiteLLM |
| Phi-4 (Microsoft) | Pequeno, rápido, bom raciocínio | ollama |
| BERTimbau-large | NER PT-BR mais preciso | Upgrade direto |
| Qwen2.5-72B (DashScope) | Melhor reasoning (já primary) | Já integrado |

### Estratégia de Modelo Local

```bash
# Instalar Ollama no VPS Hetzner (CX42 — 4 vCPUs, 16GB RAM)
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.1:8b     # 4.7GB — cabe na RAM
ollama pull phi4:mini       # 2.5GB — para NER rápida

# Integrar como fallback final na cadeia
# intelligence_provider.py → adicionar OllamaProvider
```

---

*Gerado em 2026-04-14 | Enio + Claude Code Opus 4.6*
*Fonte: Exploração exaustiva do código-fonte — frontend/src/lib/, apps/web/, api/, tests/, migrations/*
