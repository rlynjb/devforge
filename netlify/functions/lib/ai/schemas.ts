import { z } from 'zod';

export const projectPlanSchema = z.object({
  summary: z.string().describe('A 2-3 sentence project summary'),
  goals: z.array(z.string()).describe('3-5 project goals'),
  nonGoals: z.array(z.string()).describe('2-3 things explicitly out of scope'),
  mvpFeatures: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        priority: z.enum(['must', 'should', 'could']),
      })
    )
    .describe('5-10 MVP features ranked by priority'),
  techStack: z.array(
    z.object({
      category: z.string().describe('e.g. Frontend, Backend, Database'),
      choice: z.string(),
      rationale: z.string(),
    })
  ),
  openQuestions: z.array(z.string()).describe('Unresolved decisions or questions'),
});

export const generatedDocsSchema = z.object({
  readme: z.string().describe('Full README.md content in markdown'),
  roadmap: z.string().describe('Full ROADMAP.md content in markdown'),
  gettingStarted: z.string().describe('Full GETTING_STARTED.md content'),
  featureList: z.string().describe('Feature list as markdown'),
});

export const deployConfigSchema = z.object({
  netlifyToml: z.string().describe('Contents of netlify.toml'),
  envVars: z.array(
    z.object({
      key: z.string(),
      description: z.string(),
      required: z.boolean(),
    })
  ),
});
