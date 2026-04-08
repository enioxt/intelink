export type JourneyStep =
  | 'setup'
  | 'entities'
  | 'relationships'
  | 'documents'
  | 'analysis'
  | 'report';

export interface JourneyState {
  currentStep: JourneyStep;
  completedSteps: JourneyStep[];
  investigationId: string | null;
}

export const JOURNEY_STEPS: JourneyStep[] = [
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
  steps: JourneyStep[];
  current_step: JourneyStep;
  completed_steps: JourneyStep[];
  created_at: string;
  updated_at?: string;
  connections?: Array<{ from: string; to: string; type: string }>;
  metadata?: Record<string, unknown>;
}
