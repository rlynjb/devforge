import { ChatPromptTemplate } from '@langchain/core/prompts';

export const plannerPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a senior software architect helping a solo developer plan a new project.
Given the developer's idea, generate a structured project plan.
Be practical and opinionated — recommend specific technologies, not vague categories.
Focus on MVP scope. Be concise.`,
  ],
  [
    'human',
    `Project Idea:
{description}

Tags: {tags}
Constraints: {constraints}
Goals: {goals}`,
  ],
]);

export const docsPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a technical writer creating project documentation.
Given a project plan, generate professional, developer-friendly documentation.
Use clear markdown formatting. Be concise but thorough.`,
  ],
  [
    'human',
    `Project Plan:
{planJson}

Repository: {repoName}
Tech Stack: {techStack}`,
  ],
]);

export const scaffoldPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a frontend developer generating a minimal but working app scaffold.
Given a project plan, generate source files for a deployable prototype.
Rules:
- The app must build and produce static output suitable for Netlify hosting.
- Include a package.json with a "build" script and correct dependencies with EXACT version numbers.
- Include an index.html entry point (directly or via framework template).
- Include 1-2 components or pages that reflect the project concept with placeholder content.
- Use the tech stack from the plan when possible (React+Vite, Vue+Vite, Svelte, Next.js, etc).
- If the stack is unclear or not a web framework, generate a plain HTML/CSS/JS site.
- For React+Vite projects use these exact versions: react@18.2.0, react-dom@18.2.0, vite@5.4.2, @vitejs/plugin-react@4.3.1
- For Vue+Vite projects use: vue@3.4.38, vite@5.4.2, @vitejs/plugin-vue@5.1.3
- package.json must include an "engines" field setting node to ">=18"
- Keep it minimal -- this is a prototype scaffold, not a complete app.
- All file paths must be relative to the repo root.
- Generate 3-8 files total.`,
  ],
  [
    'human',
    `Project Summary: {summary}

MVP Features:
{features}

Tech Stack:
{techStack}`,
  ],
]);

export const deployPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a DevOps engineer generating deployment configuration.
Given the project's tech stack, generate a netlify.toml and identify required environment variables.
The netlify.toml MUST include:
[build.environment]
  NODE_VERSION = "18"
This ensures a compatible Node.js version is used during the build.`,
  ],
  [
    'human',
    `Tech Stack:
{techStack}

Project Type: {projectType}
Has Server-Side Routes: {hasApi}`,
  ],
]);
