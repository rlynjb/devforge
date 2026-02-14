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

export const deployPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a DevOps engineer generating deployment configuration.
Given the project's tech stack, generate a netlify.toml and identify required environment variables.`,
  ],
  [
    'human',
    `Tech Stack:
{techStack}

Project Type: {projectType}
Has Server-Side Routes: {hasApi}`,
  ],
]);
