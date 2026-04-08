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
