import { NextResponse } from 'next/server'

// CHATBOT-EVO-INTELINK-007 — GATEWAY_REGISTRY discovery contract
// Gateway at chatbot.egos.ia.br calls this to register intelink in routing table.
// Response shape mirrors 852's /api/_internal/discover.

export const MANIFEST = {
  name: 'INTELINK — Assistente de Inteligência Policial',
  slug: 'intelink',
  version: '5.0.0',
  description: 'Agente de investigação policial com acesso a Neo4j, OSINT, análise de vínculos e documentos.',
  capabilities: [
    'streaming',
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
  ],
  use_case: 'police-intelligence',
  status: 'active',
  model: process.env.OPENROUTER_MODEL ?? 'minimax/minimax-m2.5',
  evidence: {
    chat_route: 'app/api/chat/route.ts',
    tools: 'lib/tools/intelink-tools.ts',
    memory: 'lib/memory/chat-memory.ts',
    rag: 'lib/rag/context-retriever.ts',
  },
}

export function GET() {
  return NextResponse.json(MANIFEST)
}
