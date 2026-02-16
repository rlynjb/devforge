import type {
  IdeaInput,
  AppSettings,
  ProjectPlan,
  ProjectState,
  RepoConfig,
  RepoResult,
  GeneratedDocs,
  GeneratedScaffold,
  DeployConfig,
} from '../../shared/types';

const BASE = '/.netlify/functions';

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

async function put<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // State
  createProject: () => post<ProjectState>(`${BASE}/state`, {}),
  loadProject: (id: string) => get<ProjectState>(`${BASE}/state?id=${id}`),
  saveProject: (state: ProjectState) => put<{ ok: boolean }>(`${BASE}/state`, state),
  listProjects: () => get<{ projects: string[] }>(`${BASE}/state`),

  // AI
  generatePlan: (idea: IdeaInput, settings: AppSettings) =>
    post<ProjectPlan>(`${BASE}/ai-plan`, { idea, settings }),
  generateDocs: (plan: ProjectPlan, repoName: string, settings: AppSettings) =>
    post<GeneratedDocs>(`${BASE}/ai-docs`, { plan, repoName, settings }),
  generateScaffold: (plan: ProjectPlan, settings: AppSettings) =>
    post<GeneratedScaffold>(`${BASE}/ai-scaffold`, { plan, settings }),
  generateDeployConfig: (
    techStack: string,
    projectType: string,
    hasApi: boolean,
    settings: AppSettings
  ) => post<DeployConfig>(`${BASE}/ai-deploy`, { techStack, projectType, hasApi, settings }),

  // GitHub
  getGitHubUser: () => get<{ login: string }>(`${BASE}/github-create`),
  createRepo: (config: RepoConfig) => post<RepoResult>(`${BASE}/github-create`, config),
  commitFiles: (repoFullName: string, files: { path: string; content: string }[], message: string) =>
    post<{ ok: boolean }>(`${BASE}/github-commit`, { repoFullName, files, message }),

  // Netlify
  linkNetlify: (
    repoFullName: string,
    siteName: string,
    buildCommand: string,
    publishDir: string,
    files?: { path: string; content: string }[]
  ) =>
    post<{ siteId: string; siteUrl: string; adminUrl: string }>(`${BASE}/netlify-link`, {
      repoFullName,
      siteName,
      buildCommand,
      publishDir,
      files,
    }),

  // Settings
  getSettings: () => get<AppSettings>(`${BASE}/settings`),
  saveSettings: (settings: AppSettings) => put<{ ok: boolean }>(`${BASE}/settings`, settings),
};
