export type StepId = 'idea' | 'plan' | 'repo' | 'docs' | 'deploy';

export type StepStatus = 'locked' | 'active' | 'approved' | 'completed' | 'error';

export interface StepState {
  id: StepId;
  status: StepStatus;
  approvedAt?: string;
  completedAt?: string;
}

export interface IdeaInput {
  description: string;
  tags: string[];
  constraints: string[];
  goals: string[];
}

export interface ProjectPlan {
  summary: string;
  goals: string[];
  nonGoals: string[];
  mvpFeatures: { name: string; description: string; priority: 'must' | 'should' | 'could' }[];
  techStack: { category: string; choice: string; rationale: string }[];
  openQuestions: string[];
}

export interface RepoConfig {
  name: string;
  description: string;
  isPrivate: boolean;
  owner: string;
}

export interface RepoResult {
  url: string;
  cloneUrl: string;
  fullName: string;
  defaultBranch: string;
}

export interface GeneratedDocs {
  readme: string;
  roadmap: string;
  gettingStarted: string;
  featureList: string;
}

export interface GeneratedScaffold {
  files: { path: string; content: string }[];
  buildCommand: string;
  publishDir: string;
}

export interface PromptPolicy {
  projectOverview: string;
  techConventions: string;
  codeStyleRules: string[];
  architectureRules: string[];
  dos: string[];
  donts: string[];
  testingGuidelines: string;
  dependenciesPolicy: string;
}

export interface RulePreset {
  id: string;
  name: string;
  rules: Partial<PromptPolicy>;
  createdAt: string;
}

export interface DeployConfig {
  netlifyToml: string;
  envVars: { key: string; description: string; required: boolean }[];
  siteId?: string;
  siteUrl?: string;
}

export type RepoSource =
  | { type: 'local'; path: string }
  | { type: 'github'; repo: string };

export interface RepoScanResult {
  files: string[];
  detected: Record<string, boolean>;
}

export interface AppSettings {
  aiProvider: 'openai' | 'anthropic';
  model: string;
  rulePresets?: RulePreset[];
  repoSource?: RepoSource;
}

export interface ProjectState {
  id: string;
  createdAt: string;
  updatedAt: string;
  currentStep: StepId;
  steps: Record<StepId, StepState>;
  idea: IdeaInput | null;
  plan: ProjectPlan | null;
  repo: RepoConfig | null;
  repoResult: RepoResult | null;
  docs: GeneratedDocs | null;
  scaffold: GeneratedScaffold | null;
  policy: PromptPolicy | null;
  deploy: DeployConfig | null;
  settings: AppSettings;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  step: StepId;
  message: string;
  detail?: string;
}
