'use client';

import { useProjectStore } from '@/hooks/useProject';
import type { StepId, StepStatus } from '../../shared/types';
import {
  Lightbulb,
  ClipboardList,
  GitBranch,
  FileText,
  Rocket,
  Plus,
  Settings,
  Lock,
} from 'lucide-react';
import clsx from 'clsx';

const STEPS: { id: StepId; label: string; icon: React.ElementType }[] = [
  { id: 'idea', label: 'Idea', icon: Lightbulb },
  { id: 'plan', label: 'Plan', icon: ClipboardList },
  { id: 'repo', label: 'Repository', icon: GitBranch },
  { id: 'docs', label: 'Documentation', icon: FileText },
  { id: 'deploy', label: 'Deploy', icon: Rocket },
];

const STATUS_COLORS: Record<StepStatus, string> = {
  locked: 'text-muted',
  active: 'text-accent',
  approved: 'text-warning',
  completed: 'text-success',
  error: 'text-error',
};

const STATUS_BG: Record<StepStatus, string> = {
  locked: '',
  active: 'bg-accent/10',
  approved: 'bg-warning/10',
  completed: 'bg-success/10',
  error: 'bg-error/10',
};

interface SidebarProps {
  onNewProject: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({ onNewProject, onOpenSettings }: SidebarProps) {
  const project = useProjectStore((s) => s.project);

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-surface">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <Rocket className="h-6 w-6 text-accent" />
        <h1 className="text-lg font-bold">DevForge</h1>
      </div>

      {/* Steps */}
      <nav className="flex-1 px-2 py-4">
        {STEPS.map((step) => {
          const status = project?.steps[step.id]?.status ?? 'locked';
          const isCurrent = project?.currentStep === step.id;
          const Icon = step.icon;
          const isLocked = status === 'locked';

          return (
            <div
              key={step.id}
              className={clsx(
                'mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                isCurrent && 'bg-accent/15 font-medium',
                !isCurrent && !isLocked && 'hover:bg-surface-hover cursor-pointer',
                isLocked && 'opacity-50 cursor-not-allowed',
                STATUS_COLORS[status]
              )}
            >
              {isLocked ? (
                <Lock className="h-4 w-4 shrink-0" />
              ) : (
                <Icon className="h-4 w-4 shrink-0" />
              )}
              <span className="text-foreground">{step.label}</span>
              {status !== 'locked' && (
                <span
                  className={clsx(
                    'ml-auto rounded-full px-2 py-0.5 text-xs',
                    STATUS_BG[status],
                    STATUS_COLORS[status]
                  )}
                >
                  {status}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-border p-2">
        <button
          onClick={onNewProject}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>
    </aside>
  );
}
