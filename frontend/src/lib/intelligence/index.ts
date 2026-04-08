/**
 * Intelligence Module — EGOS Inteligência
 * Portado de egos-lab/apps/intelink + /home/enio/INTELINK
 * Data: 2026-04-09
 */

// Core matching & graph
export * from './cross-reference-service';
export * from './entity-matcher';
export * from './graph-algorithms';
export * from './graph-aggregator';
export * from './auto-merge';
export * from './matcher';

// AI & prompts
export * from './ai-router';
export * from './ai-chat';
export * from './meta-prompts';
export * from './analysis-prompts';
export * from './narrative-prompt';
export * from './system-prompt';
export * from './prompts-registry';
export * from './rag-context-retriever';
export * from './llm-verifier';

// Analysis
export * from './confidence-system';
export * from './accuracy-tracker';
export * from './chat-memory';

// Cross-case
export * from './cross-case-types';
export * from './cross-case-utils';

// Document processing
export * from './document-extraction';
export * from './file-handling';
export * from './image-ocr';
export * from './intelink-service';

// ETL
export * from './etl-base-dos-dados';
export * from './etl-normalizer';

// Misc
export * from './commands';
export * from './investigations';
export * from './messages';
export * from './telegram-utils';
export * from './evidence-validation';
export * from './bloom-filter';
export * from './embedding-cache';
export * from './entity-cache';
