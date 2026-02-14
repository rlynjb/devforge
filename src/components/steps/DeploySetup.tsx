'use client';

import { useState, useEffect } from 'react';
import { useProjectStore } from '@/hooks/useProject';
import { api } from '@/lib/api';
import { ApprovalGate } from '../ApprovalGate';
import { Rocket, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react';

export function DeploySetup() {
  const { project, setProject, addLog } = useProjectStore();
  const [generating, setGenerating] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [netlifyToml, setNetlifyToml] = useState(project?.deploy?.netlifyToml ?? '');
  const [envVars, setEnvVars] = useState(project?.deploy?.envVars ?? []);
  const [deployed, setDeployed] = useState(!!project?.deploy?.siteUrl);

  useEffect(() => {
    if (!project?.deploy && project?.plan) {
      generateConfig();
    }
  }, []);

  async function generateConfig() {
    if (!project?.plan) return;
    setGenerating(true);
    addLog({ level: 'info', step: 'deploy', message: 'Generating deploy configuration...' });

    try {
      const techStack = project.plan.techStack
        .map((t) => `${t.category}: ${t.choice}`)
        .join(', ');
      const config = await api.generateDeployConfig(techStack, 'web-app', true, project.settings);

      setNetlifyToml(config.netlifyToml);
      setEnvVars(config.envVars);
      addLog({ level: 'success', step: 'deploy', message: 'Deploy configuration generated' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Config generation failed';
      addLog({ level: 'error', step: 'deploy', message });
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove() {
    if (!project?.repoResult) return;
    setDeploying(true);

    try {
      // Step 1: Commit netlify.toml to repo
      addLog({ level: 'info', step: 'deploy', message: 'Committing netlify.toml...' });
      await api.commitFiles(
        project.repoResult.fullName,
        [{ path: 'netlify.toml', content: netlifyToml }],
        'chore: add netlify configuration'
      );

      // Step 2: Create Netlify site linked to repo
      addLog({ level: 'info', step: 'deploy', message: 'Creating Netlify site...' });
      const siteName = project.repoResult.fullName.split('/')[1];
      const result = await api.linkNetlify(
        project.repoResult.fullName,
        siteName,
        'npm run build',
        '.next'
      );

      const deploy = {
        netlifyToml,
        envVars,
        siteId: result.siteId,
        siteUrl: result.siteUrl,
      };

      const updated = {
        ...project,
        deploy,
        updatedAt: new Date().toISOString(),
        steps: {
          ...project.steps,
          deploy: { ...project.steps.deploy, status: 'completed' as const, approvedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
        },
      };

      setProject(updated);
      setDeployed(true);
      addLog({ level: 'success', step: 'deploy', message: `Site deployed: ${result.siteUrl}` });
      api.saveProject(updated).catch(() => {});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deployment failed';
      addLog({ level: 'error', step: 'deploy', message });
    } finally {
      setDeploying(false);
    }
  }

  function handleBack() {
    if (!project) return;
    const updated = {
      ...project,
      currentStep: 'docs' as const,
      updatedAt: new Date().toISOString(),
      steps: {
        ...project.steps,
        docs: { ...project.steps.docs, status: 'active' as const },
        deploy: { ...project.steps.deploy, status: 'locked' as const },
      },
    };
    setProject(updated);
  }

  if (deployed && project?.deploy?.siteUrl) {
    return (
      <div className="mx-auto max-w-2xl text-center py-16">
        <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-6" />
        <h2 className="text-2xl font-bold mb-2">Project Deployed!</h2>
        <p className="text-muted mb-6">Your project is live and ready to go.</p>

        <div className="space-y-3">
          {project.repoResult && (
            <a
              href={project.repoResult.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-accent hover:text-accent-hover text-sm"
            >
              GitHub: {project.repoResult.fullName}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <a
            href={project.deploy.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-accent hover:text-accent-hover text-sm"
          >
            Netlify: {project.deploy.siteUrl}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent mb-4" />
        <p className="text-muted text-sm">Generating deploy configuration...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Rocket className="h-6 w-6 text-accent" />
        <h2 className="text-xl font-semibold">Deployment Setup</h2>
      </div>

      {/* netlify.toml editor */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-muted mb-1.5">netlify.toml</label>
        <textarea
          value={netlifyToml}
          onChange={(e) => setNetlifyToml(e.target.value)}
          rows={12}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground font-mono focus:border-accent focus:outline-none resize-none"
        />
      </div>

      {/* Environment Variables */}
      {envVars.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted mb-3">Environment Variables Checklist</h3>
          <div className="rounded-lg border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Variable</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 font-medium text-center">Required</th>
                </tr>
              </thead>
              <tbody>
                {envVars.map((v, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-4 py-2 font-mono text-xs text-accent">{v.key}</td>
                    <td className="px-4 py-2 text-muted">{v.description}</td>
                    <td className="px-4 py-2 text-center">
                      {v.required ? (
                        <span className="text-error text-xs font-medium">Required</span>
                      ) : (
                        <span className="text-muted text-xs">Optional</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ApprovalGate
        warning="This will commit netlify.toml to your repo and create a Netlify site linked to your GitHub repository."
        approveLabel="Deploy to Netlify"
        onApprove={handleApprove}
        onBack={handleBack}
        loading={deploying}
      />
    </div>
  );
}
