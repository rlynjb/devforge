## **DevForge — Phase 1 Project Summary**

**DevForge** is an **AI-assisted Project Bootstrap Copilot** for solo full-stack developers.
Its goal is to turn **Idea → MVP Plan → Repo → Docs → Deployment** through a guided, intelligent workflow.

Phase 1 focuses on a **Web Dashboard interface** with semi-automation and approval gates.

---

## Core Purpose

Reduce the friction and cognitive load of starting new software projects by coordinating planning, scaffolding, and deployment setup in one place.

---

## Primary User

Solo developers / indie hackers who want:

- fast prototyping
- minimal stack decisions
- structured project setup
- less context switching

---

## Phase 1 Scope (MVP)

### 1. Idea Intake

- User enters project description
- Optional tags, constraints, or goals

### 2. AI Planning

Using an LLM (OpenAI **or** Anthropic):

- Project summary
- Goals / non-goals
- MVP feature list
- Simple tech-stack recommendation
- Open questions

### 3. Approval Gate

User reviews and edits before automation continues.

---

### 4. Repository Automation (Tool / MCP Layer)

- Create GitHub repository
- Add starter structure
- Commit initial files

---

### 5. Documentation Generation (LLM)

- README.md
- ROADMAP.md
- GETTING_STARTED.md
- Feature list

---

### 6. Deployment Setup

- Generate Netlify configuration
- GitHub → Netlify linking (auto or guided)
- Environment variable checklist

---

### 7. UI / Mock Bootstrap (Lightweight)

- Screen list
- Component skeletons
- Mock JSON seed data

---

## Architecture Overview

### Interface

**Web Dashboard (Phase 1)**

- Step sidebar (Idea → Plan → Repo → Docs → Deploy)
- Main canvas (AI output + edits)
- Logs / action history panel

---

### AI / LLM Layer

- Provider: **OpenAI or Anthropic (TBD)**
- Responsibilities:
  - Planning
  - MVP extraction
  - Docs drafting
  - UI outline

---

### LangChain.js Role

LangChain.js is used as the **AI orchestration library** for:

- Structured outputs with **Zod schemas**
- Step-based chains:
  - Planner Chain
  - Docs Chain
  - DevOps Chain

- Prompt management
- Validation & retry on invalid outputs
- Optional lightweight routing between steps

Not full multi-agent graphs yet — just **sequential intelligent chains**.

---

### Tool / MCP Layer

Used only for **real actions**:

- GitHub repo creation
- File writing & commits
- Optional Netlify linking

---

### Orchestration Style

**Guided / Semi-Automatic**

- Human approval before irreversible actions
- Automation after approval
- Shared `ProjectState` stored (e.g., Netlify Blob)
- Simple state machine (“Conductor”) controls step order

---

## What DevForge Is (Phase 1)

- AI-native project wizard
- Developer workflow console
- Intelligent bootstrap assistant
- Learning platform for LangChain.js + LLM orchestration

---

## What It Is Not (Yet)

- Not full auto-pilot
- Not complex multi-agent swarm
- Not replacing developer decisions

---

## Final Output of Phase 1

A ready-to-run prototype including:

- GitHub repository
- Generated documentation
- Basic project structure
- Deployment connection
- Clear roadmap

**Mental Model:**
**“AI-Powered New Project Wizard for Developers — Prototype First.”**
