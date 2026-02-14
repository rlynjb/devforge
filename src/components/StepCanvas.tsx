'use client';

import { useProjectStore } from '@/hooks/useProject';
import type { StepId } from '../../shared/types';
import { IdeaForm } from './steps/IdeaForm';
import { PlanReview } from './steps/PlanReview';
import { RepoSetup } from './steps/RepoSetup';
import { DocsReview } from './steps/DocsReview';
import { DeploySetup } from './steps/DeploySetup';
import type { ComponentType } from 'react';

const STEP_COMPONENTS: Record<StepId, ComponentType> = {
  idea: IdeaForm,
  plan: PlanReview,
  repo: RepoSetup,
  docs: DocsReview,
  deploy: DeploySetup,
};

export function StepCanvas() {
  const project = useProjectStore((s) => s.project);

  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted">Create a new project to get started.</p>
      </div>
    );
  }

  const Component = STEP_COMPONENTS[project.currentStep];

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <Component />
    </main>
  );
}
