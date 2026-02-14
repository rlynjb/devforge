# DevForge — Implementation Plan

## Context
DevForge is an AI-assisted Project Bootstrap Copilot that guides solo developers through **Idea → Plan → Repo → Docs → Deploy**. This plan builds a Phase 1 MVP as a Next.js app deployed on Netlify, with both OpenAI and Anthropic as switchable AI providers, and full GitHub + Netlify integration.

**Architecture: Separated frontend/backend** — Next.js for the frontend, dedicated Netlify Functions (`netlify/functions/`) for the backend.

---

## Tech Stack
- **Frontend:** Next.js 14+ (App Router, TypeScript, `src/` directory), Tailwind CSS (dark theme), Zustand (client state), lucide-react (icons)
- **Backend:** Netlify Functions (TypeScript) in `netlify/functions/`
- **AI:** LangChain.js (`@langchain/openai`, `@langchain/anthropic`) with Zod structured outputs
- **Integrations:** Octokit (`@octokit/rest`) for GitHub API, Netlify API for deployment
- **Persistence:** Netlify Blobs (`@netlify/blobs`) for project state

---

## Directory Structure
```
devforge/
├── netlify.toml
├── .env.example
├── .env.local                          (gitignored)
├── shared/
│   └── types.ts                        (shared types between frontend & backend)
│
├── netlify/
│   └── functions/
│       ├── ai-plan.ts                  (POST: generate project plan via LangChain)
│       ├── ai-docs.ts                  (POST: generate documentation via LangChain)
│       ├── ai-deploy.ts                (POST: generate deploy config via LangChain)
│       ├── github-create.ts            (POST: create GitHub repo via Octokit)
│       ├── github-commit.ts            (POST: commit files to repo)
│       ├── netlify-link.ts             (POST: create Netlify site, link to repo)
│       ├── state.ts                    (GET/POST/PUT: project state CRUD)
│       ├── settings.ts                 (GET/PUT: AI provider settings)
│       └── lib/
│           ├── ai/
│           │   ├── chains.ts           (LangChain chain definitions)
│           │   ├── schemas.ts          (Zod schemas for structured output)
│           │   ├── providers.ts        (OpenAI/Anthropic model factory)
│           │   └── prompts.ts          (prompt templates)
│           ├── github.ts               (Octokit wrapper)
│           ├── netlify-api.ts          (Netlify REST API wrapper)
│           ├── state-machine.ts        (Conductor: step transitions)
│           └── store.ts                (Netlify Blob Store persistence)
│
├── src/                                (Next.js frontend)
│   ├── app/
│   │   ├── layout.tsx                  (dark theme, 3-column layout)
│   │   ├── page.tsx                    (wraps Dashboard)
│   │   └── globals.css
│   ├── components/
│   │   ├── Dashboard.tsx               (main client shell)
│   │   ├── Sidebar.tsx                 (step navigation + status)
│   │   ├── StepCanvas.tsx              (routes currentStep → component)
│   │   ├── LogPanel.tsx                (action log with auto-scroll)
│   │   ├── ApprovalGate.tsx            (approve/reject with warning)
│   │   ├── SettingsModal.tsx           (AI provider toggle)
│   │   └── steps/
│   │       ├── IdeaForm.tsx
│   │       ├── PlanReview.tsx
│   │       ├── RepoSetup.tsx
│   │       ├── DocsReview.tsx
│   │       └── DeploySetup.tsx
│   ├── hooks/
│   │   └── useProject.ts              (Zustand store)
│   └── lib/
│       └── api.ts                      (fetch wrapper for /.netlify/functions/*)
```

---

## Build Order (10 steps)

### Step 1: Scaffold & Dependencies
- `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`
- Install: `langchain @langchain/openai @langchain/anthropic @langchain/core zod @octokit/rest @netlify/blobs zustand lucide-react clsx @netlify/functions`
- Install dev: `@netlify/plugin-nextjs`
- Create `netlify.toml` with `[functions]` directory config + Next.js plugin
- Create `.env.example` and `.env.local`
- Create `netlify/functions/` and `shared/` directories

### Step 2: Shared Types & State Machine
- **`shared/types.ts`** — All shared types: `StepId`, `StepStatus`, `IdeaInput`, `ProjectPlan`, `RepoConfig`, `RepoResult`, `GeneratedDocs`, `DeployConfig`, `ProjectState`, `AppSettings`, `LogEntry`
- **`netlify/functions/lib/state-machine.ts`** — `createInitialState()`, `canTransition()`, `advanceStep()`, `approveStep()`. Step order: idea→plan→repo→docs→deploy
- **`netlify/functions/lib/store.ts`** — Netlify Blob Store: `saveState()`, `loadState()`, `listProjects()`

### Step 3: AI Layer (backend)
- **`netlify/functions/lib/ai/schemas.ts`** — Zod schemas for `projectPlan`, `generatedDocs`, `deployConfig`
- **`netlify/functions/lib/ai/providers.ts`** — `getModel(settings)` → OpenAI or Anthropic `BaseChatModel`
- **`netlify/functions/lib/ai/prompts.ts`** — `ChatPromptTemplate` for planner, docs, deploy
- **`netlify/functions/lib/ai/chains.ts`** — `createPlannerChain()`, `createDocsChain()`, `createDeployChain()`

### Step 4: GitHub Integration (backend)
- **`netlify/functions/lib/github.ts`** — `createRepo()`, `commitFiles()` (Git Data API for atomic commits), `getAuthenticatedUser()`

### Step 5: Netlify Integration (backend)
- **`netlify/functions/lib/netlify-api.ts`** — `createSite()` with repo linking, `setEnvVars()`

### Step 6: Netlify Functions (backend endpoints)
Each function is a standalone handler at `/.netlify/functions/<name>`:
- **`ai-plan.ts`** — POST: receives `{ idea, settings }`, runs planner chain, returns `ProjectPlan`
- **`ai-docs.ts`** — POST: receives `{ plan, repoName, settings }`, runs docs chain, returns `GeneratedDocs`
- **`ai-deploy.ts`** — POST: receives `{ techStack, projectType, hasApi, settings }`, runs deploy chain
- **`github-create.ts`** — POST: receives `RepoConfig`, creates repo, returns `RepoResult`
- **`github-commit.ts`** — POST: receives `{ repoFullName, files, message }`, commits files
- **`netlify-link.ts`** — POST: receives `{ repoFullName, siteName, buildCommand, publishDir }`, creates site
- **`state.ts`** — GET (load/list), POST (create), PUT (update) project state via Blob Store
- **`settings.ts`** — GET/PUT AI provider settings

### Step 7: Frontend Client API & State
- **`src/lib/api.ts`** — Typed fetch wrapper: `api.generatePlan(idea, settings)`, `api.createRepo(config)`, etc. All call `/.netlify/functions/*`
- **`src/hooks/useProject.ts`** — Zustand store: `project`, `logs`, `setProject()`, `addLog()`, `updatePlan()`, `updateDocs()`

### Step 8: Layout Shell & Navigation (frontend)
- **`src/app/layout.tsx`** — Dark theme (`bg-gray-950`), 3-column grid
- **`src/app/page.tsx`** — Server component wrapping `<Dashboard />`
- **`src/components/Dashboard.tsx`** — Client: init project from localStorage/API, render layout
- **`src/components/Sidebar.tsx`** — 5 steps with status badges (locked/active/approved/completed/error), "New Project", settings gear
- **`src/components/StepCanvas.tsx`** — Maps `currentStep` to step component
- **`src/components/LogPanel.tsx`** — Scrollable, color-coded log entries
- **`src/components/ApprovalGate.tsx`** — Warning text + Approve/Back buttons

### Step 9: Step Components (frontend)
- **`IdeaForm.tsx`** — Description textarea, tag chips, constraints/goals inputs, "Generate Plan" button → calls `api.generatePlan()`
- **`PlanReview.tsx`** — Editable sections (summary, goals, non-goals, MVP features with priority, tech stack table, open questions), "Regenerate" button, ApprovalGate
- **`RepoSetup.tsx`** — Pre-filled repo name/description, public/private toggle, ApprovalGate → `api.createRepo()`
- **`DocsReview.tsx`** — 4 tabs with markdown preview + raw edit, "Regenerate" per doc, ApprovalGate → `api.commitFiles()`
- **`DeploySetup.tsx`** — netlify.toml editor, env var checklist, ApprovalGate → commits config + `api.linkNetlify()`, shows final URL
- **`SettingsModal.tsx`** — Provider dropdown, model input, save

### Step 10: Polish
- Tailwind config: status colors, dark mode class strategy
- Error handling: structured errors from functions, inline error banners, log entries
- `netlify.toml` finalized

---

## netlify.toml Configuration
```toml
[build]
  command = "npm run build"
  publish = ".next"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

## Frontend → Backend Communication
All frontend API calls go through `src/lib/api.ts`, which calls `/.netlify/functions/<name>`. In local dev with `netlify dev`, these are served automatically. Example:
```typescript
// src/lib/api.ts
const BASE = '/.netlify/functions';

export const api = {
  generatePlan: (idea: IdeaInput, settings: AppSettings) =>
    post(`${BASE}/ai-plan`, { idea, settings }),
  createRepo: (config: RepoConfig) =>
    post(`${BASE}/github-create`, config),
  // ...
};
```

## Key Architecture Decisions
- **Separated frontend/backend**: Next.js serves the UI, Netlify Functions handle all server logic. Clear boundary, independent scaling.
- **Shared types**: `shared/types.ts` is imported by both frontend and backend — single source of truth.
- **Git Data API** for atomic multi-file commits
- **Structured output** via `.withStructuredOutput(zodSchema)` — guaranteed valid JSON
- **Approval gates**: state machine enforces active→approved→completed for irreversible actions
- **`netlify dev`** for local development: serves both Next.js and functions together

## Verification
1. `netlify dev` — dashboard loads with dark theme, sidebar shows 5 steps
2. Fill in idea form → AI generates plan (test with both OpenAI and Anthropic)
3. Approve plan → repo config appears with pre-filled name
4. Approve repo → real GitHub repo created (verify at github.com)
5. Docs generated → approve → files committed to repo
6. Deploy config → approve → Netlify site created and linked
7. Full flow: idea → deployed site URL
