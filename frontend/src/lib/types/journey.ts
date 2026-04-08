export type JourneyStepName =
  | 'setup'
  | 'entities'
  | 'relationships'
  | 'documents'
  | 'analysis'
  | 'report';

export interface JourneyStep {
  name: JourneyStepName;
  label?: string;
  stepNumber?: number;
  completedAt?: string;
  timestamp?: string;
  entityId?: string;
  entityName?: string;
  entityType?: string;
  action?: string;
  source?: string;
  visibleConnectionsSnapshot?: Array<{ name: string; type?: string }>;
  metadata?: Record<string, unknown>;
}

export type JourneyStepLegacy = JourneyStepName;

export interface JourneyState {
  currentStep: JourneyStepName;
  completedSteps: JourneyStepName[];
  investigationId: string | null;
}

export const JOURNEY_STEPS: JourneyStepName[] = [
  'setup',
  'entities',
  'relationships',
  'documents',
  'analysis',
  'report',
];

export interface InvestigationJourney {
  id: string;
  investigation_id: string;
  title?: string;
  status?: 'active' | 'completed' | 'archived' | string;
  context?: string;
  steps: JourneyStep[];
  stepCount?: number;
  current_step: JourneyStepName;
  completed_steps: JourneyStepName[];
  created_at: string;
  updated_at?: string;
  connections?: Array<{ from: string; to: string; type: string }>;
  metadata?: Record<string, unknown>;
  aiAnalysis?: unknown;
  visibleConnectionsSnapshot?: Array<{ name: string; type?: string }>;
}
