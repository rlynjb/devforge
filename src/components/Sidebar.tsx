'use client';

import { useState } from 'react';
import { useProjectStore } from '@/hooks/useProject';
import { api } from '@/lib/api';
import type { StepId, StepStatus, RepoSource, RepoScanResult } from '../../shared/types';
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
  FolderGit2,
  Loader2,
  CheckCircle2,
  XCircle,
  Unplug,
  ChevronDown,
  Info,
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
  onViewFile?: (source: RepoSource, filePath: string, content?: string) => void;
}

const DETECTED_FILES = ['AI_RULES.md', 'README.md', 'ROADMAP.md', 'GETTING_STARTED.md', 'FEATURES.md', 'package.json', 'netlify.toml'];

async function scanLocalDirectory(dirHandle: FileSystemDirectoryHandle): Promise<RepoScanResult> {
  const files: string[] = [];

  async function walk(handle: FileSystemDirectoryHandle, prefix: string) {
    for await (const entry of handle.values()) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.kind === 'file') {
        files.push(path);
      } else if (entry.kind === 'directory' && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await walk(entry as FileSystemDirectoryHandle, path);
      }
    }
  }

  await walk(dirHandle, '');

  const detected: Record<string, boolean> = {};
  for (const file of DETECTED_FILES) {
    detected[file] = files.includes(file);
  }

  return { files, detected };
}

async function readLocalFile(dirHandle: FileSystemDirectoryHandle, filePath: string): Promise<string> {
  const parts = filePath.split('/');
  let current: FileSystemDirectoryHandle = dirHandle;

  for (let i = 0; i < parts.length - 1; i++) {
    current = await current.getDirectoryHandle(parts[i]);
  }

  const fileHandle = await current.getFileHandle(parts[parts.length - 1]);
  const file = await fileHandle.getFile();
  return file.text();
}

function ConnectedRepo({ onViewFile }: { onViewFile?: (source: RepoSource, filePath: string, content?: string) => void }) {
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);
  const [showForm, setShowForm] = useState(false);
  const [sourceType, setSourceType] = useState<'github' | 'local'>('github');
  const [inputValue, setInputValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<RepoScanResult | null>(null);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [connectedSource, setConnectedSource] = useState<RepoSource | null>(null);
  const [error, setError] = useState<string | null>(null);

  const repoSource = connectedSource ?? project?.settings.repoSource ?? null;
  const defaultRepo = project?.repoResult?.fullName ?? '';

  async function handleConnectLocal() {
    setScanning(true);
    setError(null);

    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      setDirHandle(handle);

      const result = await scanLocalDirectory(handle);
      setScanResult(result);

      const source: RepoSource = { type: 'local', path: handle.name };
      setConnectedSource(source);
      if (project) {
        setProject({
          ...project,
          settings: { ...project.settings, repoSource: source },
          updatedAt: new Date().toISOString(),
        });
      }

      setShowForm(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled the picker
      } else {
        setError(err instanceof Error ? err.message : 'Failed to open folder');
      }
    } finally {
      setScanning(false);
    }
  }

  async function handleConnectGitHub() {
    const value = inputValue.trim() || defaultRepo;
    if (!value) return;

    const source: RepoSource = { type: 'github', repo: value };
    setScanning(true);
    setError(null);

    try {
      const result = await api.scanRepo(source);
      setScanResult(result);

      setConnectedSource(source);
      if (project) {
        setProject({
          ...project,
          settings: { ...project.settings, repoSource: source },
          updatedAt: new Date().toISOString(),
        });
      }

      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  async function handleFileClick(file: string) {
    if (repoSource?.type === 'local' && dirHandle) {
      try {
        const content = await readLocalFile(dirHandle, file);
        onViewFile?.(repoSource, file, content);
      } catch {
        onViewFile?.(repoSource, file);
      }
    } else if (repoSource) {
      onViewFile?.(repoSource, file);
    }
  }

  function handleDisconnect() {
    setScanResult(null);
    setDirHandle(null);
    setConnectedSource(null);
    if (project) {
      const settings = { ...project.settings };
      delete settings.repoSource;
      setProject({
        ...project,
        settings,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return (
    <div className="px-2 pb-3">
      <div className="flex items-center justify-between px-3 mb-2">
        <div className="flex items-center gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted/60">
            Connected Repo
          </p>
          <div className="relative group">
            <Info className="h-3 w-3 text-muted/40 hover:text-muted cursor-help transition-colors" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-52 rounded-lg border border-border bg-surface px-3 py-2 text-[11px] leading-relaxed text-muted shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
              Connect a local folder or GitHub repo to see which DevForge-generated files exist. Click any detected file to preview its contents.
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 rotate-45 border-b border-r border-border bg-surface -mt-1" />
            </div>
          </div>
        </div>
        {repoSource && scanResult && (
          <button
            onClick={handleDisconnect}
            className="text-muted hover:text-error transition-colors"
            title="Disconnect"
          >
            <Unplug className="h-3 w-3" />
          </button>
        )}
      </div>

      {scanResult && repoSource ? (
        <div className="px-1">
          <div className="rounded-lg border border-border bg-background/50 px-3 py-2 mb-2">
            <div className="flex items-center gap-1.5 mb-1">
              <FolderGit2 className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-medium truncate">
                {repoSource.type === 'github' ? repoSource.repo : repoSource.path}
              </span>
            </div>
            <p className="text-[10px] text-muted">
              {repoSource.type === 'github' ? 'GitHub' : 'Local'} · {scanResult.files.length} files
            </p>
          </div>
          <div className="space-y-0.5">
            {DETECTED_FILES.map((file) => {
              const found = scanResult.detected[file];
              return (
                <button
                  key={file}
                  onClick={() => found && handleFileClick(file)}
                  disabled={!found}
                  className={clsx(
                    'flex w-full items-center gap-2 rounded px-2 py-1 text-xs transition-colors',
                    found
                      ? 'hover:bg-surface-hover cursor-pointer'
                      : 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {found ? (
                    <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                  ) : (
                    <XCircle className="h-3 w-3 text-muted shrink-0" />
                  )}
                  <span className="truncate">{file}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : showForm ? (
        <div className="px-1 space-y-2">
          <div className="flex gap-1">
            <button
              onClick={() => setSourceType('github')}
              className={clsx(
                'flex-1 rounded px-2 py-1 text-xs font-medium transition-colors',
                sourceType === 'github'
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted hover:bg-surface-hover'
              )}
            >
              GitHub
            </button>
            <button
              onClick={() => setSourceType('local')}
              className={clsx(
                'flex-1 rounded px-2 py-1 text-xs font-medium transition-colors',
                sourceType === 'local'
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted hover:bg-surface-hover'
              )}
            >
              Local
            </button>
          </div>

          {sourceType === 'github' ? (
            <>
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnectGitHub()}
                placeholder={defaultRepo || 'owner/repo'}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
              />
              {error && <p className="text-xs text-error">{error}</p>}
              <div className="flex gap-1">
                <button
                  onClick={handleConnectGitHub}
                  disabled={scanning}
                  className="flex-1 rounded bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {scanning ? (
                    <span className="flex items-center justify-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Scanning
                    </span>
                  ) : (
                    'Connect'
                  )}
                </button>
                <button
                  onClick={() => { setShowForm(false); setError(null); }}
                  className="rounded border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {error && <p className="text-xs text-error">{error}</p>}
              <div className="flex gap-1">
                <button
                  onClick={handleConnectLocal}
                  disabled={scanning}
                  className="flex-1 rounded bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {scanning ? (
                    <span className="flex items-center justify-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Scanning
                    </span>
                  ) : (
                    'Choose Folder'
                  )}
                </button>
                <button
                  onClick={() => { setShowForm(false); setError(null); }}
                  className="rounded border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="px-1">
          <button
            onClick={() => {
              setShowForm(true);
              if (defaultRepo) setInputValue(defaultRepo);
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted hover:text-foreground hover:border-border/80 transition-colors"
          >
            <FolderGit2 className="h-3.5 w-3.5" />
            Connect Repo
          </button>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ onNewProject, onOpenSettings, onViewFile }: SidebarProps) {
  const project = useProjectStore((s) => s.project);
  const [phase1Open, setPhase1Open] = useState(true);
  const [phase2Open, setPhase2Open] = useState(false);

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
        <div className="px-2 pt-4 pb-2">
          <button
            onClick={() => setPhase1Open(!phase1Open)}
            className="flex w-full items-center justify-between px-3 mb-1 group"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted/60 group-hover:text-muted transition-colors">
              Phase 1
            </p>
            <ChevronDown
              className={clsx(
                'h-3 w-3 text-muted/40 group-hover:text-muted transition-all',
                !phase1Open && '-rotate-90'
              )}
            />
          </button>
          {phase1Open && (
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
          )}
        </div>

        {/* Connected Repo */}
        <ConnectedRepo onViewFile={onViewFile} />

        {/* Phase 2 - Coming Soon */}
        <div className="px-2 pb-4">
          <button
            onClick={() => setPhase2Open(!phase2Open)}
            className="flex w-full items-center justify-between px-3 mb-1 group"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted/60 group-hover:text-muted transition-colors">
              Phase 2 — Coming Soon
            </p>
            <ChevronDown
              className={clsx(
                'h-3 w-3 text-muted/40 group-hover:text-muted transition-all',
                !phase2Open && '-rotate-90'
              )}
            />
          </button>
          {phase2Open && (
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
          )}
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
