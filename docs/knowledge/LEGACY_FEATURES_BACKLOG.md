# Intelink — Legacy Features Backlog (EGOSv4 / EGOSv2)

> **Contexto:** Durante a limpeza de documentação (2026-04-14), identificamos capacidades valiosas implementadas ou idealizadas em iterações anteriores do Intelink (ex: EGOSv4, EGOSv2) que merecem ser preservadas para futura integração no Intelink v3.

---

## 🏛️ Schema Padrão i2 Analyst's Notebook (IBM)

O schema do Intelink v4 era estritamente baseado no padrão mundial i2 Analyst's Notebook:
- Usado por 100% da polícia do Reino Unido e 80% dos EUA.
- **Entidades são ALVOS, não metadados:**
  - `PERSON`, `VEHICLE`, `LOCATION`, `PHONE`, `ORGANIZATION` (facções: PCC, CV), `FIREARM`.
  - Policiais, advogados, delegacias, drogas e celulares apreendidos **NÃO** são entidades, são `metadata` ou `evidences[]`.
- **Relacionamentos:** `ACCOMPLICE`, `OWNER`, `FAMILY`, `LIVES_AT`, `WORKS_AT`, `MEMBER_OF`, `VICTIM_OF`, `SUSPECT_OF`.

**Ação sugerida:** Avaliar se o schema atual do Neo4j (`DATABASE_SCHEMA.md`) precisa de refinamento para aderir ao padrão i2.

---

## 🚀 Capacidades e Protocolos Avançados

### 1. Sistema de Quorum (Aprovação de Edições)
- Toda edição de entidade exige confirmação de outro membro.
- Status `pending` → notificação enviada → outro membro aprova → `approved` → log em `intelink_activity_log` com hash da mudança.
- Ideal para operações conjuntas e auditoria de cadeia de custódia.

### 2. Tsun-Cha Protocol (Modo Debate)
- Permitir ao usuário questionar ativamente as conclusões da IA ("Chat IA Avançado").
- IA atua como "Devil's Advocate" nas deduções da investigação.

### 3. Índice Rho (Saúde da Rede)
- Métrica de saúde de rede que detecta "centralização excessiva".
- Análise de centralidade para identificar "hubs" e pontes na rede criminal.

### 4. PWA Offline Mode + Sync
- Service worker implementado para acesso offline.
- Ideal para investigadores em campo (WebRTC / Automerge CRDT planejado na PHASE-3 do v3 já conversa com isso).

### 5. Document Intelligence Avançado
- **Vision OCR:** Gemini Vision para PDFs escaneados (imagens), além da extração de texto.
- **Áudio:** Transcrição via Groq Whisper para depoimentos.

### 6. Alertas Cruzados (Cross-Case)
- Detecção automática da mesma entidade surgindo em operações/casos diferentes em tempo real.

### 7. Telegram Bot Integrado
- Bot (`@IntelinkBOT`) para entrada rápida de dados de campo via comandos Telegram, com sync automático para o Dashboard.

---

## 📌 Como usar este backlog
Esses itens devem ser transferidos para `TASKS.md` (na PHASE-3 ou PHASE-4) conforme a necessidade de produto for exigindo.
