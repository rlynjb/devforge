import { RunnableSequence } from '@langchain/core/runnables';
import { getModel } from './providers';
import { plannerPrompt, docsPrompt, scaffoldPrompt, deployPrompt } from './prompts';
import { projectPlanSchema, generatedDocsSchema, scaffoldSchema, deployConfigSchema } from './schemas';
import type { AppSettings, IdeaInput, ProjectPlan } from '../../../../shared/types';

export function createPlannerChain(settings: AppSettings) {
  const model = getModel(settings);
  const structuredModel = model.withStructuredOutput(projectPlanSchema);

  return RunnableSequence.from([
    {
      description: (input: IdeaInput) => input.description,
      tags: (input: IdeaInput) => input.tags.join(', ') || 'none',
      constraints: (input: IdeaInput) => input.constraints.join(', ') || 'none',
      goals: (input: IdeaInput) => input.goals.join(', ') || 'none',
    },
    plannerPrompt,
    structuredModel,
  ]);
}

export function createDocsChain(settings: AppSettings) {
  const model = getModel(settings);
  const structuredModel = model.withStructuredOutput(generatedDocsSchema);

  return RunnableSequence.from([
    {
      planJson: (input: { plan: ProjectPlan; repoName: string }) =>
        JSON.stringify(input.plan, null, 2),
      repoName: (input: { plan: ProjectPlan; repoName: string }) => input.repoName,
      techStack: (input: { plan: ProjectPlan; repoName: string }) =>
        input.plan.techStack.map((t) => `${t.category}: ${t.choice}`).join('\n'),
    },
    docsPrompt,
    structuredModel,
  ]);
}

export function createScaffoldChain(settings: AppSettings) {
  const model = getModel(settings);
  const structuredModel = model.withStructuredOutput(scaffoldSchema);

  return RunnableSequence.from([
    {
      summary: (input: { plan: ProjectPlan }) => input.plan.summary,
      features: (input: { plan: ProjectPlan }) =>
        input.plan.mvpFeatures.map((f) => `- ${f.name}: ${f.description}`).join('\n'),
      techStack: (input: { plan: ProjectPlan }) =>
        input.plan.techStack.map((t) => `${t.category}: ${t.choice}`).join('\n'),
    },
    scaffoldPrompt,
    structuredModel,
  ]);
}

export function createDeployChain(settings: AppSettings) {
  const model = getModel(settings);
  const structuredModel = model.withStructuredOutput(deployConfigSchema);

  return RunnableSequence.from([
    {
      techStack: (input: { techStack: string; projectType: string; hasApi: boolean }) =>
        input.techStack,
      projectType: (input: { techStack: string; projectType: string; hasApi: boolean }) =>
        input.projectType,
      hasApi: (input: { techStack: string; projectType: string; hasApi: boolean }) =>
        String(input.hasApi),
    },
    deployPrompt,
    structuredModel,
  ]);
}
