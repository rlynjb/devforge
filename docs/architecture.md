# DevForge — Architecture & Data Flow

## System Overview

DevForge is split into two layers that communicate over HTTP:

```
┌─────────────────────────────┐         ┌─────────────────────────────────┐
│        FRONTEND             │         │           BACKEND               │
│      (Next.js App)          │  HTTP   │      (Netlify Functions)        │
│                             │ ──────► │                                 │
│  src/components/            │         │  netlify/functions/             │
│  src/hooks/useProject.ts    │ ◄────── │  netlify/functions/lib/         │
│  src/lib/api.ts             │  JSON   │                                 │
└─────────────────────────────┘         └─────────────────────────────────┘
                                                      │
                                          ┌───────────┼───────────┐
                                          ▼           ▼           ▼
                                      LangChain   GitHub API   Netlify API
                                      (AI Layer)  (Octokit)    (REST)
```

- **Frontend** renders the UI, manages client state (Zustand), and calls backend endpoints.
- **Backend** runs as isolated Netlify Functions — stateless handlers that orchestrate AI, GitHub, and Netlify APIs.
- **Shared types** (`shared/types.ts`) are imported by both sides so request/response shapes are always in sync.

---

## Data Flow: Step by Step

### 1. User submits an idea

```
IdeaForm.tsx
  │
  │  User fills in description, tags, constraints, goals
  │  Clicks "Generate Plan"
  │
  ▼
api.generatePlan(idea, settings)
  │
  │  POST /.netlify/functions/ai-plan
  │  Body: { idea: IdeaInput, settings: AppSettings }
  │
  ▼
ai-plan.ts  (Netlify Function)
  │
  │  1. Reads settings.aiProvider to pick model
  │  2. Creates LangChain planner chain
  │  3. Invokes chain with idea input
  │  4. Returns structured ProjectPlan JSON
  │
  ▼
IdeaForm.tsx
  │
  │  Receives ProjectPlan
  │  Updates Zustand store (setProject)
  │  Advances step: idea → plan
  │
  ▼
PlanReview.tsx renders
```

### 2. User approves the plan

```
PlanReview.tsx
  │
  │  User reviews/edits plan sections
  │  Clicks "Approve Plan"
  │
  ▼
Zustand store update
  │
  │  steps.plan.status = 'completed'
  │  steps.repo.status = 'active'
  │  currentStep = 'repo'
  │
  ▼
RepoSetup.tsx renders
```

### 3. User creates a GitHub repository

```
RepoSetup.tsx
  │
  │  Pre-fills repo name from plan summary
  │  User clicks "Create Repository" (ApprovalGate)
  │
  ▼
api.createRepo(config)
  │
  │  POST /.netlify/functions/github-create
  │  Body: { name, description, isPrivate, owner }
  │
  ▼
github-create.ts  (Netlify Function)
  │
  │  Octokit.repos.createForAuthenticatedUser()
  │  Returns: { url, cloneUrl, fullName, defaultBranch }
  │
  ▼
RepoSetup.tsx
  │
  │  Stores RepoResult in Zustand
  │  Advances step: repo → docs
```

### 4. AI generates documentation → commits to repo

```
DocsReview.tsx
  │
  │  On mount, calls api.generateDocs(plan, repoName, settings)
  │
  ▼
ai-docs.ts  (Netlify Function)
  │
  │  LangChain docs chain generates:
  │  { readme, roadmap, gettingStarted, featureList }
  │
  ▼
DocsReview.tsx
  │
  │  User reviews 4 tabs, edits if needed
  │  Clicks "Commit Documentation" (ApprovalGate)
  │
  ▼
api.commitFiles(repoFullName, files, message)
  │
  │  POST /.netlify/functions/github-commit
  │
  ▼
github-commit.ts  (Netlify Function)
  │
  │  Uses Git Data API for atomic multi-file commit:
  │  1. Get latest commit SHA
  │  2. Create blobs for each file
  │  3. Create tree from blobs
  │  4. Create commit pointing to tree
  │  5. Update branch ref
  │
  ▼
DocsReview.tsx
  │
  │  Advances step: docs → deploy
```

### 5. Deploy setup → Netlify site creation

```
DeploySetup.tsx
  │
  │  On mount, calls api.generateDeployConfig(...)
  │
  ▼
ai-deploy.ts  (Netlify Function)
  │
  │  LangChain deploy chain generates:
  │  { netlifyToml, envVars[] }
  │
  ▼
DeploySetup.tsx
  │
  │  User reviews netlify.toml + env var checklist
  │  Clicks "Deploy to Netlify" (ApprovalGate)
  │
  │  Step 1: Commits netlify.toml to repo
  │           POST /.netlify/functions/github-commit
  │
  │  Step 2: Creates Netlify site linked to repo
  │           POST /.netlify/functions/netlify-link
  │
  ▼
netlify-link.ts  (Netlify Function)
  │
  │  POST https://api.netlify.com/api/v1/sites
  │  Links GitHub repo, sets build command + publish dir
  │  Returns: { siteId, siteUrl, adminUrl }
  │
  ▼
DeploySetup.tsx
  │
  │  Shows "Project Deployed!" with links
  │  All steps completed
```

---

## How LangChain Fits In

LangChain.js is the **AI orchestration layer** sitting inside the backend functions. It is not used on the frontend at all — the frontend only sees typed JSON responses.

### The Chain Pattern

Each AI operation is a **chain**: a pipeline of prompt → model → structured output.

```
Input (typed object)
  │
  ▼
┌─────────────────────┐
│  Input Transformer   │   Converts typed input into template variables
│  (RunnableSequence)  │   e.g. IdeaInput.tags → comma-separated string
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  ChatPromptTemplate  │   Fills system + human messages with variables
│  (plannerPrompt)     │   "You are a senior software architect..."
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  BaseChatModel       │   OpenAI (gpt-4o) OR Anthropic (claude-sonnet)
│  .withStructuredOutput│   Wraps model with Zod schema enforcement
│  (projectPlanSchema) │   Guarantees output matches the schema
└─────────┬───────────┘
          │
          ▼
Output (typed object matching Zod schema)
```

### Three Chains

| Chain | Input | Zod Schema | Output |
|-------|-------|------------|--------|
| **Planner** | `IdeaInput` (description, tags, constraints, goals) | `projectPlanSchema` | `ProjectPlan` (summary, goals, MVP features, tech stack, open questions) |
| **Docs** | `{ plan, repoName }` | `generatedDocsSchema` | `GeneratedDocs` (readme, roadmap, gettingStarted, featureList) |
| **Deploy** | `{ techStack, projectType, hasApi }` | `deployConfigSchema` | `DeployConfig` (netlifyToml, envVars[]) |

### Provider Switching

The `getModel(settings)` factory in `providers.ts` returns either a `ChatOpenAI` or `ChatAnthropic` instance based on `settings.aiProvider`. Both implement `BaseChatModel`, so chains are completely provider-agnostic:

```
settings.aiProvider === 'openai'
  → ChatOpenAI({ modelName: 'gpt-4o' })

settings.aiProvider === 'anthropic'
  → ChatAnthropic({ modelName: 'claude-sonnet-4-20250514' })
```

The user toggles this in the Settings modal. The change propagates through the Zustand store → API request body → backend chain construction.

### Structured Output (Key Concept)

LangChain's `.withStructuredOutput(zodSchema)` is the critical piece. It:

1. **For OpenAI** — uses function calling / JSON mode to constrain the model output
2. **For Anthropic** — uses tool use to extract structured data

Either way, the chain returns a **typed JavaScript object** matching the Zod schema — not raw text. No JSON parsing, no regex extraction, no retry loops for malformed output.

```typescript
// This is all it takes:
const structuredModel = model.withStructuredOutput(projectPlanSchema);
// structuredModel.invoke(messages) → ProjectPlan object, guaranteed
```

### Why Not Direct API Calls?

LangChain adds value in three ways:

1. **Provider abstraction** — Switch between OpenAI and Anthropic without changing chain logic
2. **Structured output** — Zod schema enforcement across both providers with a single API
3. **Composability** — `RunnableSequence.from([transform, prompt, model])` chains steps cleanly, and each step is independently testable

---

## State Management Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Zustand     │────►│  api.ts      │────►│  Netlify Blob    │
│   (client)    │     │  (HTTP)      │     │  Store (server)  │
│               │◄────│              │◄────│                  │
└──────────────┘     └──────────────┘     └──────────────────┘

useProjectStore          fetch()            getStore().setJSON()
  .project             /.netlify/            getStore().get()
  .logs                functions/state
  .setProject()
  .addLog()
```

- **Zustand** holds the in-memory project state on the client. All UI reads from here.
- **API calls** persist state to Netlify Blob Store after important transitions (plan generated, repo created, docs committed, etc.).
- **State machine** (`state-machine.ts`) defines valid step transitions. The frontend applies transitions locally; the backend validates on save.

### Step Lifecycle

```
locked → active → approved → completed
                      ↑
           error ─────┘ (retry)
```

- `locked`: Step not yet reachable (previous step incomplete)
- `active`: User is currently on this step
- `approved`: User clicked "Approve" in the ApprovalGate — irreversible action about to execute
- `completed`: Action finished successfully, next step unlocked
- `error`: Something failed — user can retry (transitions back to `active`)

---

## Request/Response Example

Here is the full lifecycle of a single AI call — generating a project plan:

**Frontend** (`IdeaForm.tsx`):
```typescript
const plan = await api.generatePlan(
  { description: "A habit tracker app", tags: ["mobile", "health"], constraints: [], goals: ["launch in 2 weeks"] },
  { aiProvider: "anthropic", model: "claude-sonnet-4-20250514" }
);
```

**HTTP Request**:
```
POST /.netlify/functions/ai-plan
Content-Type: application/json

{
  "idea": {
    "description": "A habit tracker app",
    "tags": ["mobile", "health"],
    "constraints": [],
    "goals": ["launch in 2 weeks"]
  },
  "settings": {
    "aiProvider": "anthropic",
    "model": "claude-sonnet-4-20250514"
  }
}
```

**Backend** (`ai-plan.ts` → `chains.ts`):
```
1. getModel(settings)          → ChatAnthropic instance
2. model.withStructuredOutput() → model bound to projectPlanSchema
3. RunnableSequence.invoke()   → transforms input → fills prompt → calls model
4. Returns structured object   → { summary, goals, nonGoals, mvpFeatures, ... }
```

**HTTP Response**:
```json
{
  "summary": "A mobile-first habit tracking application...",
  "goals": ["Track daily habits", "Streak visualization", "..."],
  "nonGoals": ["Social features", "Premium tier"],
  "mvpFeatures": [
    { "name": "Habit CRUD", "description": "...", "priority": "must" },
    { "name": "Daily check-in", "description": "...", "priority": "must" }
  ],
  "techStack": [
    { "category": "Frontend", "choice": "React Native", "rationale": "..." }
  ],
  "openQuestions": ["Push notification strategy?"]
}
```

**Frontend** receives this typed `ProjectPlan`, stores it in Zustand, and renders `PlanReview.tsx`.
