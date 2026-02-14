'use client';

import { useState, useEffect } from 'react';
import { useProjectStore } from '@/hooks/useProject';
import { api } from '@/lib/api';
import { ApprovalGate } from '../ApprovalGate';
import { GitBranch, Loader2, ExternalLink } from 'lucide-react';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export function RepoSetup() {
  const { project, setProject, addLog } = useProjectStore();
  const plan = project?.plan;

  const [name, setName] = useState(plan ? slugify(plan.summary.split('.')[0]) : '');
  const [description, setDescription] = useState(plan?.summary ?? '');
  const [isPrivate, setIsPrivate] = useState(false);
  const [owner, setOwner] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(!!project?.repoResult);

  useEffect(() => {
    api.getGitHubUser().then((data) => setOwner(data.login)).catch(() => {});
  }, []);

  async function handleApprove() {
    if (!project) return;
    setLoading(true);
    addLog({ level: 'info', step: 'repo', message: `Creating repository ${owner}/${name}...` });

    try {
      const result = await api.createRepo({ name, description, isPrivate, owner });

      const updated = {
        ...project,
        repo: { name, description, isPrivate, owner },
        repoResult: result,
        currentStep: 'docs' as const,
        updatedAt: new Date().toISOString(),
        steps: {
          ...project.steps,
          repo: { ...project.steps.repo, status: 'completed' as const, approvedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
          docs: { ...project.steps.docs, status: 'active' as const },
        },
      };

      setProject(updated);
      setCreated(true);
      addLog({ level: 'success', step: 'repo', message: `Repository created: ${result.url}` });
      api.saveProject(updated).catch(() => {});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Repo creation failed';
      addLog({ level: 'error', step: 'repo', message });
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (!project) return;
    const updated = {
      ...project,
      currentStep: 'plan' as const,
      updatedAt: new Date().toISOString(),
      steps: {
        ...project.steps,
        plan: { ...project.steps.plan, status: 'active' as const },
        repo: { ...project.steps.repo, status: 'locked' as const },
      },
    };
    setProject(updated);
  }

  if (created && project?.repoResult) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <GitBranch className="h-6 w-6 text-success" />
          <h2 className="text-xl font-semibold">Repository Created</h2>
        </div>
        <div className="rounded-lg border border-success/30 bg-success/5 p-4">
          <p className="text-sm mb-2">Your repository is ready:</p>
          <a
            href={project.repoResult.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-accent hover:text-accent-hover text-sm"
          >
            {project.repoResult.fullName}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <GitBranch className="h-6 w-6 text-accent" />
        <h2 className="text-xl font-semibold">Repository Setup</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">Repository Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
          {owner && (
            <p className="mt-1 text-xs text-muted">
              Will create: {owner}/{name}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="private"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <label htmlFor="private" className="text-sm text-foreground">
            Private repository
          </label>
        </div>
      </div>

      <ApprovalGate
        warning="This will create a real GitHub repository. Make sure the name and settings are correct."
        approveLabel="Create Repository"
        onApprove={handleApprove}
        onBack={handleBack}
        loading={loading}
      />
    </div>
  );
}
