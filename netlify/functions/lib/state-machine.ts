import { randomUUID } from 'crypto';
import type { ProjectState, StepId, StepStatus } from '../../../shared/types';

const STEP_ORDER: StepId[] = ['idea', 'plan', 'repo', 'docs', 'deploy'];

const TRANSITIONS: Record<StepStatus, StepStatus[]> = {
  locked: ['active'],
  active: ['approved', 'error'],
  approved: ['completed', 'error'],
  completed: [],
  error: ['active'],
};

export function createInitialState(): ProjectState {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentStep: 'idea',
    steps: {
      idea: { id: 'idea', status: 'active' },
      plan: { id: 'plan', status: 'locked' },
      repo: { id: 'repo', status: 'locked' },
      docs: { id: 'docs', status: 'locked' },
      deploy: { id: 'deploy', status: 'locked' },
    },
    idea: null,
    plan: null,
    repo: null,
    repoResult: null,
    docs: null,
    scaffold: null,
    deploy: null,
    settings: { aiProvider: 'openai', model: 'gpt-4o' },
  };
}

export function canTransition(from: StepStatus, to: StepStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function advanceStep(state: ProjectState): ProjectState {
  const idx = STEP_ORDER.indexOf(state.currentStep);
  if (idx < 0 || idx >= STEP_ORDER.length - 1) return state;

  const nextStep = STEP_ORDER[idx + 1];
  return {
    ...state,
    updatedAt: new Date().toISOString(),
    currentStep: nextStep,
    steps: {
      ...state.steps,
      [state.currentStep]: {
        ...state.steps[state.currentStep],
        status: 'completed' as const,
        completedAt: new Date().toISOString(),
      },
      [nextStep]: {
        ...state.steps[nextStep],
        status: 'active' as const,
      },
    },
  };
}

export function approveStep(state: ProjectState, stepId: StepId): ProjectState {
  const step = state.steps[stepId];
  if (!canTransition(step.status, 'approved')) {
    throw new Error(`Cannot approve step "${stepId}" from status "${step.status}"`);
  }
  return {
    ...state,
    updatedAt: new Date().toISOString(),
    steps: {
      ...state.steps,
      [stepId]: { ...step, status: 'approved' as const, approvedAt: new Date().toISOString() },
    },
  };
}
