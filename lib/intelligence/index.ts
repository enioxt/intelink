/**
 * Intelligence Module — EGOS Inteligência
 * Absorvido de /home/enio/intelink/frontend/src/lib/intelligence (2026-04-18)
 * B (egos-lab) é o codebase canônico. intelink-service/commands/telegram-utils
 * ficam em lib/intelink/ (versão mais nova e completa).
 */

// Core matching & graph
export * from './cross-reference-service';
export * from './entity-matcher';
export * from './graph-algorithms';
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
export * from './accuracy-tracker';
export * from './chat-memory';
export type { ConfidenceLevel, PramanaMetadata } from './confidence-system';
export { PRAMANA_STYLES, getPramanaStyle, getPramanaBadgeProps } from './confidence-system';

// Cross-case
export * from './cross-case-types';
export * from './cross-case-utils';

// Document processing
export * from './file-handling';
export * from './image-ocr';

// ETL
export * from './etl-base-dos-dados';
export * from './etl-normalizer';

// Data structures
export * from './bloom-filter';
export * from './embedding-cache';
export * from './entity-cache';
export * from './indexed-db-cache';

// Investigation & evidence
export * from './investigations';
export * from './messages';
export * from './evidence-validation';
