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
  GitPullRequest,
  Shield,
  Workflow,
  Search,
  FlaskConical,
  ListChecks,
  Activity,
  Palette,
} from 'lucide-react';
import clsx from 'clsx';

const STEPS: { id: StepId; label: string; icon: React.ElementType }[] = [
  { id: 'idea', label: 'Idea', icon: Lightbulb },
  { id: 'plan', label: 'Plan', icon: ClipboardList },
  { id: 'repo', label: 'Repository', icon: GitBranch },
  { id: 'docs', label: 'Documentation', icon: FileText },
  { id: 'deploy', label: 'Deploy', icon: Rocket },
];

const PHASE2_FEATURES: { label: string; icon: React.ElementType }[] = [
  { label: 'Issue Tracking', icon: ListChecks },
  { label: 'Test Generation', icon: FlaskConical },
  { label: 'Code Review', icon: Shield },
  { label: 'PR Generation', icon: GitPullRequest },
  { label: 'CI/CD Pipeline', icon: Workflow },
  { label: 'Monitoring', icon: Activity },
  { label: 'Codebase RAG', icon: Search },
  { label: 'UI Prototyping', icon: Palette },
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

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Phase 1 Steps */}
        <div className="px-2 py-4">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted/60">
            Phase 1
          </p>
          <nav>
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
        </div>

        {/* Phase 2 - Coming Soon */}
        <div className="px-2 pb-4">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted/60">
            Phase 2 — Coming Soon
          </p>
          <nav>
            {PHASE2_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.label}
                  className="mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm opacity-35 cursor-not-allowed"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted" />
                  <span className="text-muted">{feature.label}</span>
                  <span className="ml-auto rounded-full bg-muted/10 px-1.5 py-0.5 text-[9px] font-medium text-muted/70">
                    soon
                  </span>
                </div>
              );
            })}
          </nav>
        </div>
      </div>

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
