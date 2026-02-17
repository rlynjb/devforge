'use client';

import { useState, useCallback } from 'react';
import { useProjectStore } from '@/hooks/useProject';
import { api } from '@/lib/api';
import { Sidebar } from './Sidebar';
import { StepCanvas } from './StepCanvas';
import { LogPanel } from './LogPanel';
import { SettingsModal } from './SettingsModal';
import { RepoViewer } from './RepoViewer';
import { ScrollText } from 'lucide-react';
import type { RepoSource } from '../../shared/types';

export function Dashboard() {
  const { project, setProject, addLog, clearLogs } = useProjectStore();
  const [showLogs, setShowLogs] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [viewingFile, setViewingFile] = useState<{ source: RepoSource; path: string; content?: string } | null>(null);

  const handleNewProject = useCallback(async () => {
    try {
      const state = await api.createProject();
      setProject(state);
      clearLogs();
      addLog({ level: 'success', step: 'idea', message: 'New project created' });
    } catch (err) {
      // If Netlify functions aren't available (local dev without netlify dev),
      // create a client-side state
      const fallbackState = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentStep: 'idea' as const,
        steps: {
          idea: { id: 'idea' as const, status: 'active' as const },
          plan: { id: 'plan' as const, status: 'locked' as const },
          repo: { id: 'repo' as const, status: 'locked' as const },
          docs: { id: 'docs' as const, status: 'locked' as const },
          deploy: { id: 'deploy' as const, status: 'locked' as const },
        },
        idea: null,
        plan: null,
        repo: null,
        repoResult: null,
        docs: null,
        scaffold: null,
        policy: null,
        deploy: null,
        settings: { aiProvider: 'openai' as const, model: 'gpt-4o' },
      };
      setProject(fallbackState);
      clearLogs();
      addLog({ level: 'info', step: 'idea', message: 'Project created (local mode)' });
    }
  }, [setProject, addLog, clearLogs]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        onNewProject={handleNewProject}
        onOpenSettings={() => setShowSettings(true)}
        onViewFile={(source, path, content) => setViewingFile({ source, path, content })}
      />

      {project ? (
        <StepCanvas />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">Welcome to DevForge</h2>
            <p className="mt-2 text-muted max-w-md">
              AI-powered project bootstrap copilot. Turn your idea into a deployed MVP with guided
              automation.
            </p>
          </div>
          <button
            onClick={handleNewProject}
            className="rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          >
            Start New Project
          </button>
        </div>
      )}

      {/* Log toggle button */}
      {!showLogs && (
        <button
          onClick={() => setShowLogs(true)}
          className="fixed right-4 bottom-4 rounded-full bg-surface border border-border p-3 text-muted hover:text-foreground transition-colors shadow-lg"
        >
          <ScrollText className="h-5 w-5" />
        </button>
      )}

      <LogPanel isOpen={showLogs} onClose={() => setShowLogs(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      {viewingFile && (
        <RepoViewer
          source={viewingFile.source}
          filePath={viewingFile.path}
          onClose={() => setViewingFile(null)}
          initialContent={viewingFile.content}
        />
      )}
    </div>
  );
}
