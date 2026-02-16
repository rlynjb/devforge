'use client';

import { useState, useEffect } from 'react';
import { useProjectStore } from '@/hooks/useProject';
import { api } from '@/lib/api';
import { ApprovalGate } from '../ApprovalGate';
import { FileText, Code2, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
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
  const { project, setProject, addLog, updateDocs, updateScaffold } = useProjectStore();
  const docs = project?.docs;
  const scaffold = project?.scaffold;
  const [activeTab, setActiveTab] = useState<DocTab>('readme');
  const [generatingDocs, setGeneratingDocs] = useState(false);
  const [generatingScaffold, setGeneratingScaffold] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [scaffoldOpen, setScaffoldOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<number | null>(null);

  useEffect(() => {
    if (project?.plan && project?.repoResult) {
      if (!docs) generateDocs();
      if (!scaffold) generateScaffold();
    }
  }, []);

  async function generateDocs() {
    if (!project?.plan || !project?.repoResult) return;
    setGeneratingDocs(true);
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
      setGeneratingDocs(false);
    }
  }

  async function generateScaffold() {
    if (!project?.plan) return;
    setGeneratingScaffold(true);
    addLog({ level: 'info', step: 'docs', message: 'Generating app scaffold...' });

    try {
      const generated = await api.generateScaffold(project.plan, project.settings);
      updateScaffold(generated);
      addLog({
        level: 'success',
        step: 'docs',
        message: `App scaffold generated (${generated.files.length} files)`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scaffold generation failed';
      addLog({ level: 'error', step: 'docs', message });
    } finally {
      setGeneratingScaffold(false);
    }
  }

  function handleEditToggle() {
    if (editMode && docs) {
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
    addLog({ level: 'info', step: 'docs', message: 'Committing files to repo...' });

    try {
      // Combine scaffold files + doc files into one commit
      const docFiles = TABS.map((tab) => ({
        path: tab.filename,
        content: docs[tab.key],
      }));
      const scaffoldFiles = scaffold?.files ?? [];
      const allFiles = [...scaffoldFiles, ...docFiles];

      await api.commitFiles(
        project.repoResult.fullName,
        allFiles,
        'feat: add app scaffold and documentation'
      );

      const updated = {
        ...project,
        docs,
        scaffold: scaffold ?? null,
        currentStep: 'deploy' as const,
        updatedAt: new Date().toISOString(),
        steps: {
          ...project.steps,
          docs: { ...project.steps.docs, status: 'completed' as const, approvedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
          deploy: { ...project.steps.deploy, status: 'active' as const },
        },
      };

      setProject(updated);
      addLog({ level: 'success', step: 'docs', message: 'App scaffold and documentation committed to repository' });
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

  const isGenerating = generatingDocs || generatingScaffold;

  if (isGenerating && !docs && !scaffold) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent mb-4" />
        <p className="text-muted text-sm">
          {generatingDocs && generatingScaffold
            ? 'Generating docs and app scaffold...'
            : generatingDocs
              ? 'Generating documentation...'
              : 'Generating app scaffold...'}
        </p>
      </div>
    );
  }

  if (!docs && !scaffold) {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        <p className="text-muted mb-4">No documentation generated yet.</p>
        <button
          onClick={() => { generateDocs(); generateScaffold(); }}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Generate Docs & Scaffold
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-accent" />
          <h2 className="text-xl font-semibold">Review Documentation & Scaffold</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEditToggle}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            {editMode ? 'Save' : 'Edit'}
          </button>
          <button
            onClick={() => { generateDocs(); generateScaffold(); }}
            disabled={isGenerating}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-foreground transition-colors disabled:opacity-50"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* App Scaffold Section */}
      <div className="mb-6 rounded-lg border border-border bg-surface overflow-hidden">
        <button
          onClick={() => setScaffoldOpen(!scaffoldOpen)}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-surface-hover transition-colors"
        >
          {scaffoldOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Code2 className="h-4 w-4 text-accent" />
          <span>App Scaffold</span>
          {scaffold ? (
            <span className="ml-auto text-xs text-muted">
              {scaffold.files.length} files · build: {scaffold.buildCommand} · output: {scaffold.publishDir}
            </span>
          ) : generatingScaffold ? (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-muted">
              <Loader2 className="h-3 w-3 animate-spin" /> Generating...
            </span>
          ) : (
            <span className="ml-auto text-xs text-warning">Not generated</span>
          )}
        </button>

        {scaffoldOpen && scaffold && (
          <div className="border-t border-border">
            <div className="flex">
              {/* File tree */}
              <div className="w-56 border-r border-border bg-background/50 max-h-80 overflow-y-auto">
                {scaffold.files.map((file, i) => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(selectedFile === i ? null : i)}
                    className={clsx(
                      'flex w-full px-3 py-1.5 text-xs font-mono text-left hover:bg-surface-hover transition-colors',
                      selectedFile === i && 'bg-accent/10 text-accent'
                    )}
                  >
                    {file.path}
                  </button>
                ))}
              </div>

              {/* File preview */}
              <div className="flex-1 max-h-80 overflow-auto">
                {selectedFile !== null ? (
                  <pre className="p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                    {scaffold.files[selectedFile].content}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-40 text-xs text-muted">
                    Select a file to preview
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {scaffoldOpen && !scaffold && !generatingScaffold && (
          <div className="border-t border-border p-4 text-center">
            <button
              onClick={generateScaffold}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
            >
              Generate Scaffold
            </button>
          </div>
        )}
      </div>

      {/* Doc Tabs */}
      {docs && (
        <>
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
        </>
      )}

      <ApprovalGate
        warning="This will commit the app scaffold and documentation files to your GitHub repository."
        approveLabel="Commit All Files"
        onApprove={handleApprove}
        onBack={handleBack}
        loading={committing}
      />
    </div>
  );
}
