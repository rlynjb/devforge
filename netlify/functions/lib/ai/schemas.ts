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

export const scaffoldSchema = z.object({
  files: z
    .array(
      z.object({
        path: z.string().describe('File path relative to repo root, e.g. "src/App.jsx" or "index.html"'),
        content: z.string().describe('Full file content'),
      })
    )
    .describe('All source files for the app scaffold (3-8 files). Must include package.json and an entry point.'),
  buildCommand: z.string().describe('The build command, e.g. "npm run build"'),
  publishDir: z.string().describe('The build output directory served by Netlify, e.g. "dist" or "build"'),
});

export const promptPolicySchema = z.object({
  projectOverview: z
    .string()
    .describe('2-3 sentence project context for any AI coding assistant working on this project'),
  techConventions: z
    .string()
    .describe('Specific tech stack conventions: frameworks, versions, and their idiomatic usage patterns'),
  codeStyleRules: z
    .array(z.string())
    .describe('5-10 specific, actionable code style rules'),
  architectureRules: z
    .array(z.string())
    .describe('3-7 architecture rules: file organization, module boundaries, import conventions'),
  dos: z
    .array(z.string())
    .describe('5-10 positive patterns the AI should always follow'),
  donts: z
    .array(z.string())
    .describe('5-10 anti-patterns the AI must never use'),
  testingGuidelines: z
    .string()
    .describe('Testing framework, patterns, and coverage expectations'),
  dependenciesPolicy: z
    .string()
    .describe('Approved dependencies and restrictions on adding new ones'),
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
