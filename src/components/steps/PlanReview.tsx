'use client';

import { useState } from 'react';
import { useProjectStore } from '@/hooks/useProject';
import { api } from '@/lib/api';
import { ApprovalGate } from '../ApprovalGate';
import { ClipboardList, Loader2, Pencil, Check } from 'lucide-react';
import clsx from 'clsx';
import type { ProjectPlan } from '../../../shared/types';

const PRIORITY_COLORS = {
  must: 'bg-error/20 text-error',
  should: 'bg-warning/20 text-warning',
  could: 'bg-accent/20 text-accent',
};

export function PlanReview() {
  const { project, setProject, addLog, updatePlan } = useProjectStore();
  const plan = project?.plan;
  const [loading, setLoading] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (!plan) {
    return <p className="text-muted">No plan generated yet.</p>;
  }

  function startEdit(field: string, value: string) {
    setEditingField(field);
    setEditValue(value);
  }

  function saveEdit(field: keyof ProjectPlan) {
    if (!plan) return;
    const updated = { ...plan };

    if (field === 'summary') {
      updated.summary = editValue;
    } else if (field === 'goals' || field === 'nonGoals' || field === 'openQuestions') {
      (updated[field] as string[]) = editValue.split('\n').filter(Boolean);
    }

    updatePlan(updated);
    setEditingField(null);
  }

  async function handleRegenerate() {
    if (!project?.idea) return;
    setLoading(true);
    addLog({ level: 'info', step: 'plan', message: 'Regenerating plan...' });

    try {
      const newPlan = await api.generatePlan(project.idea, project.settings);
      updatePlan(newPlan);
      addLog({ level: 'success', step: 'plan', message: 'Plan regenerated' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Regeneration failed';
      addLog({ level: 'error', step: 'plan', message });
    } finally {
      setLoading(false);
    }
  }

  function handleApprove() {
    if (!project) return;
    const updated = {
      ...project,
      currentStep: 'repo' as const,
      updatedAt: new Date().toISOString(),
      steps: {
        ...project.steps,
        plan: { ...project.steps.plan, status: 'completed' as const, approvedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
        repo: { ...project.steps.repo, status: 'active' as const },
      },
    };
    setProject(updated);
    addLog({ level: 'success', step: 'plan', message: 'Plan approved' });
    api.saveProject(updated).catch(() => {});
  }

  function handleBack() {
    if (!project) return;
    const updated = {
      ...project,
      currentStep: 'idea' as const,
      updatedAt: new Date().toISOString(),
      steps: {
        ...project.steps,
        idea: { ...project.steps.idea, status: 'active' as const },
        plan: { ...project.steps.plan, status: 'locked' as const },
      },
    };
    setProject(updated);
  }

  function EditableSection({
    title,
    field,
    content,
  }: {
    title: string;
    field: keyof ProjectPlan;
    content: string;
  }) {
    const isEditing = editingField === field;
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted">{title}</h3>
          {isEditing ? (
            <button onClick={() => saveEdit(field)} className="text-success hover:text-success/80">
              <Check className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => startEdit(field, content)}
              className="text-muted hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {isEditing ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={4}
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none resize-none"
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-accent" />
          <h2 className="text-xl font-semibold">Review Project Plan</h2>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-foreground transition-colors disabled:opacity-50"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Regenerate
        </button>
      </div>

      <div className="space-y-4">
        <EditableSection title="Summary" field="summary" content={plan.summary} />

        <EditableSection title="Goals" field="goals" content={plan.goals.join('\n')} />

        <EditableSection title="Non-Goals" field="nonGoals" content={plan.nonGoals.join('\n')} />

        {/* MVP Features */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-medium text-muted mb-3">MVP Features</h3>
          <div className="space-y-2">
            {plan.mvpFeatures.map((f, i) => (
              <div key={i} className="flex items-start gap-3 rounded-md bg-background p-3">
                <span
                  className={clsx(
                    'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                    PRIORITY_COLORS[f.priority]
                  )}
                >
                  {f.priority}
                </span>
                <div>
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted mt-0.5">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-medium text-muted mb-3">Tech Stack</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Choice</th>
                <th className="pb-2 font-medium">Rationale</th>
              </tr>
            </thead>
            <tbody>
              {plan.techStack.map((t, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="py-2 font-mono text-xs text-accent">{t.category}</td>
                  <td className="py-2">{t.choice}</td>
                  <td className="py-2 text-muted">{t.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <EditableSection
          title="Open Questions"
          field="openQuestions"
          content={plan.openQuestions.join('\n')}
        />
      </div>

      <ApprovalGate
        warning="Approving this plan will move you to the repository creation step."
        approveLabel="Approve Plan"
        onApprove={handleApprove}
        onBack={handleBack}
      />
    </div>
  );
}
