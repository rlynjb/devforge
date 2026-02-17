import type { PromptPolicy } from './types';

export interface RuleTemplate {
  tag: string;
  label: string;
  rules: Partial<PromptPolicy>;
}

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    tag: 'typescript',
    label: 'TypeScript',
    rules: {
      codeStyleRules: [
        'Use TypeScript strict mode — no implicit any',
        'Prefer interfaces over type aliases for object shapes',
        'Use explicit return types on exported functions',
        'Use const assertions for literal types',
      ],
      architectureRules: [
        'Keep type definitions in dedicated types.ts files',
        'Use barrel exports (index.ts) for public module APIs',
      ],
      dos: [
        'Use discriminated unions for state variants',
        'Use Zod or similar for runtime validation at system boundaries',
      ],
      donts: [
        'Never use @ts-ignore — use @ts-expect-error with explanation if unavoidable',
        'Never use the any type — use unknown and narrow',
      ],
    },
  },
  {
    tag: 'react',
    label: 'React',
    rules: {
      codeStyleRules: [
        'Use functional components exclusively — no class components',
        'Use named exports for components, not default exports',
        'Keep components under 150 lines — extract sub-components when larger',
        'Use destructured props in function signatures',
      ],
      architectureRules: [
        'Place components in src/components/ organized by feature',
        'Colocate component-specific hooks, types, and styles with the component',
        'Shared hooks go in src/hooks/',
        'Keep business logic out of components — use custom hooks',
      ],
      dos: [
        'Use React.memo only when profiling shows a performance issue',
        'Use useCallback/useMemo for expensive computations, not every function',
        'Prefer controlled components for forms',
      ],
      donts: [
        'Never mutate state directly — always create new objects/arrays',
        'Never use inline styles — use CSS modules or utility classes',
        'Avoid deeply nested ternaries in JSX — extract to variables or components',
      ],
    },
  },
  {
    tag: 'vue',
    label: 'Vue',
    rules: {
      codeStyleRules: [
        'Use Composition API with <script setup> syntax',
        'Use defineProps and defineEmits for component interfaces',
        'Prefix composables with "use" (e.g., useAuth, useCart)',
      ],
      architectureRules: [
        'Place components in src/components/ organized by feature',
        'Place composables in src/composables/',
        'Use Pinia for global state management',
      ],
      dos: [
        'Use computed properties for derived state',
        'Use v-model for two-way binding on form inputs',
      ],
      donts: [
        'Never use Options API in new code',
        'Avoid watchers when computed properties suffice',
      ],
    },
  },
  {
    tag: 'nextjs',
    label: 'Next.js',
    rules: {
      codeStyleRules: [
        'Use the App Router (app/ directory) for all routes',
        'Mark client components explicitly with "use client"',
        'Prefer Server Components by default — only use Client Components for interactivity',
      ],
      architectureRules: [
        'Use route groups (parentheses) for layout organization',
        'Place shared components in src/components/, route-specific ones near their page',
        'Use server actions for form mutations',
        'Keep API routes in app/api/ for external-facing endpoints only',
      ],
      dos: [
        'Use Next.js Image component for optimized images',
        'Use dynamic imports for heavy client-side libraries',
      ],
      donts: [
        'Never import server-only code in Client Components',
        'Avoid getServerSideProps/getStaticProps — use App Router data fetching',
      ],
    },
  },
  {
    tag: 'node',
    label: 'Node.js',
    rules: {
      codeStyleRules: [
        'Use ES modules (import/export) not CommonJS (require)',
        'Use async/await — never raw Promise chains or callbacks',
        'Handle errors explicitly — never swallow exceptions silently',
      ],
      architectureRules: [
        'Separate route handlers, business logic, and data access into distinct layers',
        'Use environment variables for all configuration — never hardcode secrets',
        'Place shared utilities in a lib/ or utils/ directory',
      ],
      dos: [
        'Validate all external input (request bodies, query params, env vars)',
        'Use structured logging (JSON) in production',
      ],
      donts: [
        'Never use synchronous file or network operations in request handlers',
        'Never commit .env files — use .env.example as a template',
      ],
    },
  },
  {
    tag: 'tailwind',
    label: 'Tailwind CSS',
    rules: {
      codeStyleRules: [
        'Use Tailwind utility classes — avoid custom CSS unless absolutely necessary',
        'Group Tailwind classes logically: layout, spacing, typography, colors, effects',
        'Use @apply only in global styles for highly reused patterns',
      ],
      dos: [
        'Use Tailwind responsive prefixes (sm:, md:, lg:) for responsive design',
        'Use the cn() or clsx() utility for conditional classes',
      ],
      donts: [
        'Never use inline styles when a Tailwind class exists',
        'Avoid arbitrary values ([23px]) — use the design system scale',
      ],
    },
  },
  {
    tag: 'python',
    label: 'Python',
    rules: {
      codeStyleRules: [
        'Follow PEP 8 style — use black for formatting, ruff for linting',
        'Use type hints on all function signatures',
        'Use f-strings for string formatting',
        'Use pathlib.Path instead of os.path',
      ],
      architectureRules: [
        'Use virtual environments (venv or poetry) for dependency isolation',
        'Separate concerns into modules — one responsibility per file',
      ],
      dos: [
        'Use dataclasses or Pydantic models for structured data',
        'Use context managers (with statements) for resource management',
      ],
      donts: [
        'Never use mutable default arguments',
        'Never catch bare Exception — catch specific exception types',
      ],
    },
  },
  {
    tag: 'prisma',
    label: 'Prisma',
    rules: {
      architectureRules: [
        'Keep the Prisma schema in prisma/schema.prisma',
        'Use a single PrismaClient instance (singleton pattern)',
      ],
      dos: [
        'Use Prisma migrations for schema changes — never modify the database directly',
        'Use select/include to fetch only needed fields',
      ],
      donts: [
        'Never use raw SQL queries unless Prisma cannot express the query',
        'Never store the database URL in code — use environment variables',
      ],
    },
  },
];

/**
 * Match rule templates to a project's tech stack.
 * Takes the plan's techStack array and returns merged rules from all matching templates.
 */
export function getTemplatesForStack(
  techStack: { category: string; choice: string }[]
): Partial<PromptPolicy> {
  const stackText = techStack.map((t) => `${t.category} ${t.choice}`).join(' ').toLowerCase();

  const matched = RULE_TEMPLATES.filter((tpl) => stackText.includes(tpl.tag));

  const merged: Partial<PromptPolicy> = {};

  for (const tpl of matched) {
    for (const [key, value] of Object.entries(tpl.rules)) {
      if (Array.isArray(value)) {
        const existing = (merged as Record<string, unknown>)[key] as string[] | undefined;
        (merged as Record<string, unknown>)[key] = [...(existing ?? []), ...value];
      } else if (typeof value === 'string') {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
  }

  return merged;
}
