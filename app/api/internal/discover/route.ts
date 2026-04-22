import { NextResponse } from 'next/server'

// CHATBOT-EVO-INTELINK-007 — GATEWAY_REGISTRY discovery contract
// Gateway at chatbot.egos.ia.br calls this to register intelink in routing table.
// Path is /api/internal/discover (not /api/_internal — Next.js excludes _-prefixed folders from routing).

export const MANIFEST = {
  name: 'INTELINK — Assistente de Inteligência Policial',
  slug: 'intelink',
  version: '5.0.0',
  description: 'Agente de investigação policial com acesso a Neo4j, OSINT, análise de vínculos e documentos.',
  // Honesty rule (CHATBOT_SSOT §17.1, INC-006): list only what ships.
  // `streaming` is opt-in via `body.stream=true` (INTELINK-002, route.ts streamChatResponse).
  capabilities: [
    'streaming-opt-in',
    'tool-calling',
    'rag',
    'memory',
    'investigation-context',
    'entity-search',
    'global-cross-case-search',
    'risk-assessment',
    'document-analysis',
    'report-generation',
    'tenant-isolation',
    'pii-masking',
    'atrian-validation',
    'provenance',  // INTELINK-003: hash-chained tool-call audit via intelink_audit_logs
  ],
  use_case: 'police-intelligence',
  status: 'active',
  model: process.env.OPENROUTER_MODEL ?? 'minimax/minimax-m2.5',
  evidence: {
    chat_route: 'app/api/chat/route.ts',
    tools: 'lib/tools/intelink-tools.ts',
    memory: 'lib/memory/chat-memory.ts',
    rag: 'lib/rag/context-retriever.ts',
    streaming: 'app/api/chat/route.ts:streamChatResponse',
    provenance: 'lib/intelligence/provenance.ts + app/api/chat/[sessionId]/provenance/route.ts',
  },
}

export function GET() {
  return NextResponse.json(MANIFEST)
}
