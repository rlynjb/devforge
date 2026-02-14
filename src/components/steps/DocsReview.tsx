'use client';

import { useState, useEffect } from 'react';
import { useProjectStore } from '@/hooks/useProject';
import { api } from '@/lib/api';
import { ApprovalGate } from '../ApprovalGate';
import { FileText, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import type { GeneratedDocs } from '../../../shared/types';

type DocTab = keyof GeneratedDocs;

const TABS: { key: DocTab; label: string; filename: string }[] = [
  { key: 'readme', label: 'README', filename: 'README.md' },
  { key: 'roadmap', label: 'ROADMAP', filename: 'ROADMAP.md' },
  { key: 'gettingStarted', label: 'Getting Started', filename: 'GETTING_STARTED.md' },
  { key: 'featureList', label: 'Features', filename: 'FEATURES.md' },
];

export function DocsReview() {
  const { project, setProject, addLog, updateDocs } = useProjectStore();
  const docs = project?.docs;
  const [activeTab, setActiveTab] = useState<DocTab>('readme');
  const [generating, setGenerating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (!docs && project?.plan && project?.repoResult) {
      generateDocs();
    }
  }, []);

  async function generateDocs() {
    if (!project?.plan || !project?.repoResult) return;
    setGenerating(true);
    addLog({ level: 'info', step: 'docs', message: 'Generating documentation...' });

    try {
      const generated = await api.generateDocs(
        project.plan,
        project.repoResult.fullName,
        project.settings
      );
      updateDocs(generated);
      addLog({ level: 'success', step: 'docs', message: 'Documentation generated' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Docs generation failed';
      addLog({ level: 'error', step: 'docs', message });
    } finally {
      setGenerating(false);
    }
  }

  function handleEditToggle() {
    if (editMode && docs) {
      // Save edit
      const updated = { ...docs, [activeTab]: editContent };
      updateDocs(updated);
    } else if (docs) {
      setEditContent(docs[activeTab]);
    }
    setEditMode(!editMode);
  }

  async function handleApprove() {
    if (!project?.repoResult || !docs) return;
    setCommitting(true);
    addLog({ level: 'info', step: 'docs', message: 'Committing documentation to repo...' });

    try {
      const files = TABS.map((tab) => ({
        path: tab.filename,
        content: docs[tab.key],
      }));

      await api.commitFiles(project.repoResult.fullName, files, 'docs: add generated documentation');

      const updated = {
        ...project,
        docs,
        currentStep: 'deploy' as const,
        updatedAt: new Date().toISOString(),
        steps: {
          ...project.steps,
          docs: { ...project.steps.docs, status: 'completed' as const, approvedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
          deploy: { ...project.steps.deploy, status: 'active' as const },
        },
      };

      setProject(updated);
      addLog({ level: 'success', step: 'docs', message: 'Documentation committed to repository' });
      api.saveProject(updated).catch(() => {});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Commit failed';
      addLog({ level: 'error', step: 'docs', message });
    } finally {
      setCommitting(false);
    }
  }

  function handleBack() {
    if (!project) return;
    const updated = {
      ...project,
      currentStep: 'repo' as const,
      updatedAt: new Date().toISOString(),
      steps: {
        ...project.steps,
        repo: { ...project.steps.repo, status: 'active' as const },
        docs: { ...project.steps.docs, status: 'locked' as const },
      },
    };
    setProject(updated);
  }

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent mb-4" />
        <p className="text-muted text-sm">Generating documentation...</p>
      </div>
    );
  }

  if (!docs) {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        <p className="text-muted mb-4">No documentation generated yet.</p>
        <button
          onClick={generateDocs}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Generate Docs
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-accent" />
          <h2 className="text-xl font-semibold">Review Documentation</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEditToggle}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            {editMode ? 'Save' : 'Edit'}
          </button>
          <button
            onClick={generateDocs}
            disabled={generating}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-foreground transition-colors disabled:opacity-50"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setEditMode(false);
            }}
            className={clsx(
              'px-3 py-2 text-sm transition-colors border-b-2 -mb-px',
              activeTab === tab.key
                ? 'border-accent text-accent font-medium'
                : 'border-transparent text-muted hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-lg border border-border bg-surface p-4">
        {editMode ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={20}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground font-mono focus:border-accent focus:outline-none resize-none"
          />
        ) : (
          <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
            {docs[activeTab]}
          </pre>
        )}
      </div>

      <ApprovalGate
        warning="This will commit all documentation files to your GitHub repository."
        approveLabel="Commit Documentation"
        onApprove={handleApprove}
        onBack={handleBack}
        loading={committing}
      />
    </div>
  );
}
