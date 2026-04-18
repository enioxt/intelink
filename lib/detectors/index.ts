/**
 * Intelink Detectors — Anomaly Detection Engine
 *
 * Each detector analyzes a specific pattern of fraud, corruption, or anomaly
 * in public data. They receive entities and relationships from the ETL pipeline
 * and return structured anomalies with severity, confidence, and evidence.
 *
 * Inspired by: CEAP-Playbook (jpvss/CEAP-Playbook) and Brazilian public audit techniques.
 */

export { detectGhostEmployees } from './ghost-employees';
export { detectBenfordAnomalies } from './benford-anomaly';
export { detectSupplierConcentration } from './hhi-concentration';

// Types
export type { BenfordAnomaly, FinancialRelationship, FinancialEntity } from './benford-anomaly';
export type { HHIAnomaly } from './hhi-concentration';
