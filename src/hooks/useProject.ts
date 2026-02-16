import { create } from 'zustand';
import type { ProjectState, LogEntry, StepId, ProjectPlan, GeneratedDocs, GeneratedScaffold } from '../../shared/types';

interface ProjectStore {
  project: ProjectState | null;
  logs: LogEntry[];
  setProject: (p: ProjectState) => void;
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  updatePlan: (plan: ProjectPlan) => void;
  updateDocs: (docs: GeneratedDocs) => void;
  updateScaffold: (scaffold: GeneratedScaffold) => void;
  clearLogs: () => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  project: null,
  logs: [],

  setProject: (project) => set({ project }),

  addLog: (entry) =>
    set((s) => ({
      logs: [
        ...s.logs,
        {
          ...entry,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      ],
    })),

  updatePlan: (plan) =>
    set((s) => ({
      project: s.project ? { ...s.project, plan, updatedAt: new Date().toISOString() } : null,
    })),

  updateDocs: (docs) =>
    set((s) => ({
      project: s.project ? { ...s.project, docs, updatedAt: new Date().toISOString() } : null,
    })),

  updateScaffold: (scaffold) =>
    set((s) => ({
      project: s.project ? { ...s.project, scaffold, updatedAt: new Date().toISOString() } : null,
    })),

  clearLogs: () => set({ logs: [] }),
}));
