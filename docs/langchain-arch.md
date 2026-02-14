# DevForge -- LangChain Architecture

## What LangChain Does in This App

LangChain.js is the **AI orchestration layer** that lives entirely on the backend (`netlify/functions/lib/ai/`). The frontend never touches LangChain -- it only sends typed requests and receives typed JSON responses.

LangChain handles three things for us:

1. **Provider abstraction** -- One codebase that works with both OpenAI and Anthropic
2. **Structured output** -- AI responses come back as typed objects, not raw text
3. **Chain composition** -- Input transformation, prompt, and model wired together as a single callable unit

### System Overview

```mermaid
graph LR
    subgraph Frontend
        UI[React Components]
        API[api.ts fetch wrapper]
    end

    subgraph Backend - Netlify Functions
        FN[Function Handler]
        subgraph LangChain Layer
            CH[chains.ts]
            PR[providers.ts]
            PM[prompts.ts]
            SC[schemas.ts]
        end
    end

    subgraph External APIs
        OAI[OpenAI API]
        ANT[Anthropic API]
    end

    UI -->|user action| API
    API -->|HTTP POST JSON| FN
    FN --> CH
    CH --> PR
    CH --> PM
    CH --> SC
    PR -->|if openai| OAI
    PR -->|if anthropic| ANT
    OAI -->|structured JSON| CH
    ANT -->|structured JSON| CH
    CH -->|typed object| FN
    FN -->|HTTP Response JSON| API
    API -->|update state| UI
```

---

## File Map

```
netlify/functions/lib/ai/
  providers.ts    Model factory (OpenAI or Anthropic)
  schemas.ts      Zod schemas defining what the AI must return
  prompts.ts      Prompt templates with variable placeholders
  chains.ts       Chains that wire it all together
```

### Dependency Flow

```mermaid
graph TD
    chains[chains.ts] -->|imports| providers[providers.ts]
    chains -->|imports| prompts[prompts.ts]
    chains -->|imports| schemas[schemas.ts]

    providers --> ChatOpenAI
    providers --> ChatAnthropic
    ChatOpenAI --> BCM[BaseChatModel]
    ChatAnthropic --> BCM

    prompts --> CPT[ChatPromptTemplate]
    schemas --> ZOD[Zod Schema]

    BCM -->|.withStructuredOutput| SM[Structured Model]
    ZOD --> SM

    style chains fill:#6366f1,color:#fff
    style providers fill:#22c55e,color:#fff
    style prompts fill:#f59e0b,color:#000
    style schemas fill:#ef4444,color:#fff
```

---

## Layer 1: Providers (`providers.ts`)

The provider layer is a factory function that returns a LangChain chat model based on user settings.

```typescript
function getModel(settings: AppSettings): BaseChatModel
```

### Provider Selection

```mermaid
flowchart TD
    SET[settings.aiProvider] --> CHECK{Which provider?}
    CHECK -->|"openai"| OAI["ChatOpenAI
    modelName: gpt-4o
    temperature: 0.3"]
    CHECK -->|"anthropic"| ANT["ChatAnthropic
    modelName: claude-sonnet-4-20250514
    temperature: 0.3"]
    OAI --> BCM[BaseChatModel interface]
    ANT --> BCM
    BCM --> CHAIN[Used by chains identically]

    style OAI fill:#10a37f,color:#fff
    style ANT fill:#d97706,color:#fff
    style BCM fill:#6366f1,color:#fff
```

Both `ChatOpenAI` and `ChatAnthropic` implement `BaseChatModel`, which means every downstream consumer (chains, structured output) works identically regardless of which provider is active.

### Provider Switching End-to-End

```mermaid
sequenceDiagram
    actor User
    participant Modal as Settings Modal
    participant Store as Zustand Store
    participant API as api.ts
    participant FN as Netlify Function
    participant Prov as providers.ts

    User->>Modal: Selects "Anthropic"
    Modal->>Store: setProject({ settings: { aiProvider: "anthropic" } })
    Note over Store: Provider stored in client state

    User->>API: Clicks "Generate Plan"
    API->>FN: POST /ai-plan { idea, settings: { aiProvider: "anthropic" } }
    FN->>Prov: getModel(settings)
    Prov-->>FN: ChatAnthropic instance
    FN-->>API: ProjectPlan JSON
    API-->>Store: Update project.plan
```

The user can switch providers between steps. Each chain is constructed fresh per request.

---

## Layer 2: Schemas (`schemas.ts`)

Zod schemas define the **exact shape** of what the AI must return. They serve as both a contract and enforcement mechanism.

### Schema Map

```mermaid
graph TD
    subgraph projectPlanSchema
        PS_SUM[summary: string]
        PS_GOALS[goals: string array]
        PS_NG[nonGoals: string array]
        PS_MVP[mvpFeatures: array]
        PS_TS[techStack: array]
        PS_OQ[openQuestions: string array]

        PS_MVP --> MVP_N[name: string]
        PS_MVP --> MVP_D[description: string]
        PS_MVP --> MVP_P["priority: must | should | could"]

        PS_TS --> TS_C[category: string]
        PS_TS --> TS_CH[choice: string]
        PS_TS --> TS_R[rationale: string]
    end

    style projectPlanSchema fill:#1e293b,color:#f3f4f6
```

```mermaid
graph LR
    subgraph generatedDocsSchema
        D_R[readme: string]
        D_RM[roadmap: string]
        D_GS[gettingStarted: string]
        D_FL[featureList: string]
    end

    subgraph deployConfigSchema
        DC_NT[netlifyToml: string]
        DC_EV[envVars: array]
        DC_EV --> EV_K[key: string]
        DC_EV --> EV_D[description: string]
        DC_EV --> EV_R[required: boolean]
    end

    style generatedDocsSchema fill:#1e293b,color:#f3f4f6
    style deployConfigSchema fill:#1e293b,color:#f3f4f6
```

### The `.describe()` calls matter

Each field and array has a `.describe()` annotation:

```typescript
goals: z.array(z.string()).describe('3-5 project goals')
```

LangChain passes these descriptions to the model as part of the function/tool definition. The AI reads them as instructions -- "give me 3-5 items" -- which guides the output quality without needing it in the prompt.

---

## Layer 3: Prompts (`prompts.ts`)

Prompts are defined using `ChatPromptTemplate.fromMessages()`, which creates a reusable template with variable placeholders (`{variableName}`).

### Three Prompts

| Prompt | System Role | Human Message Variables |
|--------|-------------|------------------------|
| **plannerPrompt** | Senior software architect | `{description}`, `{tags}`, `{constraints}`, `{goals}` |
| **docsPrompt** | Technical writer | `{planJson}`, `{repoName}`, `{techStack}` |
| **deployPrompt** | DevOps engineer | `{techStack}`, `{projectType}`, `{hasApi}` |

### Prompt Structure

```mermaid
graph TD
    subgraph ChatPromptTemplate
        SYS["System Message
        Sets AI role + behavior
        'You are a senior software architect...'"]
        HUM["Human Message
        Variable placeholders
        'Project Idea: {description}
        Tags: {tags}
        Constraints: {constraints}
        Goals: {goals}'"]
    end

    INPUT["Input Transformer output
    { description, tags, constraints, goals }"] -->|fills placeholders| HUM

    SYS --> MSGS["Chat Messages Array"]
    HUM --> MSGS

    MSGS --> MODEL[Structured Model]

    style SYS fill:#6366f1,color:#fff
    style HUM fill:#22c55e,color:#fff
```

The `{description}`, `{tags}`, etc. are not hardcoded -- they get filled by the input transformer in the chain (Layer 4 below).

---

## Layer 4: Chains (`chains.ts`)

Chains are where everything connects. Each chain is a `RunnableSequence` -- a pipeline of steps that execute in order.

### Anatomy of a Chain

```mermaid
graph LR
    IN["Typed Input
    (e.g. IdeaInput)"] --> T["Step 1
    Input Transformer
    object --> strings"]
    T --> P["Step 2
    ChatPromptTemplate
    strings --> messages"]
    P --> M["Step 3
    Structured Model
    messages --> typed output"]
    M --> OUT["Typed Output
    (e.g. ProjectPlan)"]

    style T fill:#f59e0b,color:#000
    style P fill:#6366f1,color:#fff
    style M fill:#22c55e,color:#fff
```

### Planner Chain -- Full Data Flow

```mermaid
flowchart TD
    INPUT["IdeaInput
    {
      description: 'A habit tracker app',
      tags: ['mobile', 'health'],
      constraints: [],
      goals: ['launch in 2 weeks']
    }"]

    INPUT --> TRANSFORM

    subgraph "Step 1: Input Transformer"
        TRANSFORM["Extract & convert fields
        {
          description: 'A habit tracker app',
          tags: 'mobile, health',
          constraints: 'none',
          goals: 'launch in 2 weeks'
        }"]
    end

    TRANSFORM --> PROMPT

    subgraph "Step 2: ChatPromptTemplate"
        PROMPT["Fill placeholders into messages
        [
          { system: 'You are a senior architect...' },
          { human: 'Project Idea: A habit tracker app
                    Tags: mobile, health
                    Constraints: none
                    Goals: launch in 2 weeks' }
        ]"]
    end

    PROMPT --> MODEL

    subgraph "Step 3: Structured Model"
        MODEL["BaseChatModel + projectPlanSchema
        Calls OpenAI or Anthropic API
        Enforces Zod schema on response"]
    end

    MODEL --> OUTPUT

    OUTPUT["ProjectPlan
    {
      summary: 'A mobile-first habit tracker...',
      goals: ['Track daily habits', ...],
      mvpFeatures: [{ name: 'Habit CRUD', priority: 'must' }],
      techStack: [{ category: 'Frontend', choice: 'React Native' }],
      openQuestions: ['Push notification strategy?']
    }"]

    style INPUT fill:#374151,color:#f3f4f6
    style OUTPUT fill:#166534,color:#f3f4f6
```

### All Three Chains Compared

```mermaid
graph TD
    subgraph Planner Chain
        P_IN[IdeaInput] --> P_TR[Transform] --> P_PR[plannerPrompt] --> P_SM["withStructuredOutput
        (projectPlanSchema)"] --> P_OUT[ProjectPlan]
    end

    subgraph Docs Chain
        D_IN["{ plan, repoName }"] --> D_TR[Transform] --> D_PR[docsPrompt] --> D_SM["withStructuredOutput
        (generatedDocsSchema)"] --> D_OUT[GeneratedDocs]
    end

    subgraph Deploy Chain
        DE_IN["{ techStack, projectType, hasApi }"] --> DE_TR[Transform] --> DE_PR[deployPrompt] --> DE_SM["withStructuredOutput
        (deployConfigSchema)"] --> DE_OUT[DeployConfig]
    end

    style P_OUT fill:#166534,color:#fff
    style D_OUT fill:#166534,color:#fff
    style DE_OUT fill:#166534,color:#fff
    style P_IN fill:#374151,color:#f3f4f6
    style D_IN fill:#374151,color:#f3f4f6
    style DE_IN fill:#374151,color:#f3f4f6
```

---

## How `.withStructuredOutput()` Works Under the Hood

This is the most important LangChain concept in DevForge.

```typescript
const structuredModel = model.withStructuredOutput(zodSchema);
```

### OpenAI vs Anthropic -- Different Mechanisms, Same Result

```mermaid
flowchart TD
    ZOD[Zod Schema] --> CHECK{Which provider?}

    CHECK -->|OpenAI| OAI_PATH
    CHECK -->|Anthropic| ANT_PATH

    subgraph OAI_PATH [OpenAI Path]
        OAI_CONVERT["Convert Zod --> JSON Schema"]
        OAI_CALL["API call with
        response_format: { type: 'json_schema' }"]
        OAI_PARSE["Parse JSON response"]
        OAI_CONVERT --> OAI_CALL --> OAI_PARSE
    end

    subgraph ANT_PATH [Anthropic Path]
        ANT_CONVERT["Convert Zod --> Tool definition"]
        ANT_CALL["API call with
        tool_use forced"]
        ANT_EXTRACT["Extract tool result"]
        ANT_CONVERT --> ANT_CALL --> ANT_EXTRACT
    end

    OAI_PARSE --> RESULT[Typed Object matching Zod Schema]
    ANT_EXTRACT --> RESULT

    style ZOD fill:#ef4444,color:#fff
    style RESULT fill:#166534,color:#fff
    style OAI_PATH fill:#0a2e1f,color:#f3f4f6
    style ANT_PATH fill:#2e1f0a,color:#f3f4f6
```

### Why this matters

Without `.withStructuredOutput()`, you would need to:

1. Ask the AI to "respond in JSON" in the prompt (unreliable)
2. Parse the raw text response as JSON (might fail)
3. Validate against your schema (might not match)
4. Retry if parsing fails (adds latency)
5. Handle all this differently for OpenAI vs Anthropic

With `.withStructuredOutput()`, you write one line and get a guaranteed typed object back.

---

## How Chains Connect to Netlify Functions

Each chain is created and invoked inside a Netlify Function handler. The function is the thin HTTP wrapper; the chain does all the AI work.

### Request Lifecycle

```mermaid
sequenceDiagram
    participant Browser
    participant FN as Netlify Function<br/>(ai-plan.ts)
    participant Chain as LangChain Chain
    participant Model as AI Provider<br/>(OpenAI / Anthropic)

    Browser->>FN: POST /.netlify/functions/ai-plan<br/>{ idea, settings }
    FN->>FN: Parse request body

    FN->>Chain: createPlannerChain(settings)
    Note over Chain: getModel() + prompt + schema

    FN->>Chain: chain.invoke(idea)

    Chain->>Chain: Step 1: Transform IdeaInput to strings
    Chain->>Chain: Step 2: Fill prompt template
    Chain->>Model: Step 3: Send messages + schema
    Model-->>Chain: Structured JSON response
    Chain-->>FN: ProjectPlan typed object

    FN-->>Browser: Response.json(plan)
```

Example from `ai-plan.ts`:

```typescript
export default async (req: Request) => {
  const body = await req.json();                     // { idea, settings }
  const chain = createPlannerChain(body.settings);   // Build chain with right provider
  const plan = await chain.invoke(body.idea);        // Run the chain
  return Response.json(plan);                        // Return typed result
};
```

The chain is **stateless** -- constructed fresh for every request. No persistent connection or session. Ideal for serverless.

---

## Full Picture: UI to AI and Back

```mermaid
flowchart LR
    subgraph Browser
        FORM[IdeaForm.tsx] -->|onClick| STORE[Zustand Store]
        STORE --> APICLIENT[api.ts]
    end

    APICLIENT -->|"POST /.netlify/functions/ai-plan
    { idea, settings }"| NETLIFY

    subgraph Netlify Function
        NETLIFY[ai-plan.ts] --> CHAINS[chains.ts]

        subgraph LangChain Pipeline
            CHAINS --> TRANS[Input Transformer]
            TRANS --> PROMPT[ChatPromptTemplate]
            PROMPT --> SMODEL[Structured Model]
        end

        SMODEL --> PROV[providers.ts]
    end

    PROV -->|API call| AI{OpenAI or Anthropic}
    AI -->|structured JSON| SMODEL

    SMODEL -->|ProjectPlan| NETLIFY
    NETLIFY -->|JSON response| APICLIENT
    APICLIENT -->|setProject| STORE
    STORE -->|re-render| PLAN[PlanReview.tsx]

    style FORM fill:#6366f1,color:#fff
    style PLAN fill:#22c55e,color:#fff
    style AI fill:#f59e0b,color:#000
```

---

## Summary: What LangChain Replaces

| Concern | Without LangChain | With LangChain |
|---------|-------------------|----------------|
| Provider switching | Two separate API implementations | `getModel(settings)` returns either |
| Structured output | Manual JSON parsing + validation + retry | `.withStructuredOutput(zodSchema)` |
| Prompt management | String concatenation | `ChatPromptTemplate` with typed variables |
| Input transformation | Scattered across handler code | Declarative object in `RunnableSequence` |
| Pipeline composition | Nested callbacks or imperative steps | `RunnableSequence.from([...])` |

DevForge uses LangChain for **sequential intelligent chains** -- not multi-agent graphs, not complex routing, not memory/retrieval. It is the simplest useful subset of LangChain: prompt + model + structured output, composed cleanly.
