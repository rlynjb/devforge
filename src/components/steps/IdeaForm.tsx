'use client';

import { useState } from 'react';
import { useProjectStore } from '@/hooks/useProject';
import { api } from '@/lib/api';
import { Lightbulb, Loader2 } from 'lucide-react';

export function IdeaForm() {
  const { project, setProject, addLog } = useProjectStore();
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [constraints, setConstraints] = useState('');
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !description.trim()) return;

    const idea = {
      description: description.trim(),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      constraints: constraints.split(',').map((c) => c.trim()).filter(Boolean),
      goals: goals.split(',').map((g) => g.trim()).filter(Boolean),
    };

    setLoading(true);
    addLog({ level: 'info', step: 'idea', message: 'Submitting idea...' });

    try {
      addLog({ level: 'info', step: 'plan', message: 'Generating project plan with AI...' });
      const plan = await api.generatePlan(idea, project.settings);

      const updated = {
        ...project,
        idea,
        plan,
        currentStep: 'plan' as const,
        updatedAt: new Date().toISOString(),
        steps: {
          ...project.steps,
          idea: { ...project.steps.idea, status: 'completed' as const, completedAt: new Date().toISOString() },
          plan: { ...project.steps.plan, status: 'active' as const },
        },
      };

      setProject(updated);
      addLog({ level: 'success', step: 'plan', message: 'Project plan generated successfully' });

      // Persist
      api.saveProject(updated).catch(() => {});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate plan';
      addLog({ level: 'error', step: 'plan', message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Lightbulb className="h-6 w-6 text-accent" />
        <h2 className="text-xl font-semibold">Describe Your Project Idea</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">
            Project Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your project idea in a few sentences. What problem does it solve? Who is it for?"
            rows={5}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none resize-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">
            Tags <span className="font-normal">(comma-separated)</span>
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. SaaS, mobile, marketplace, AI"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">
            Constraints <span className="font-normal">(comma-separated)</span>
          </label>
          <input
            type="text"
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            placeholder="e.g. must be free tier only, no database, mobile-first"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">
            Goals <span className="font-normal">(comma-separated)</span>
          </label>
          <input
            type="text"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder="e.g. launch in 2 weeks, get 100 users, learn Next.js"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !description.trim()}
          className="flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating Plan...
            </>
          ) : (
            'Generate Plan'
          )}
        </button>
      </form>
    </div>
  );
}
