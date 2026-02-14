'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useProjectStore } from '@/hooks/useProject';
import type { AppSettings } from '../../shared/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MODEL_DEFAULTS: Record<string, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);

  const [provider, setProvider] = useState<AppSettings['aiProvider']>(
    project?.settings.aiProvider ?? 'openai'
  );
  const [model, setModel] = useState(project?.settings.model ?? 'gpt-4o');

  if (!isOpen) return null;

  function handleSave() {
    if (!project) return;
    setProject({
      ...project,
      settings: { aiProvider: provider, model },
      updatedAt: new Date().toISOString(),
    });
    onClose();
  }

  function handleProviderChange(p: AppSettings['aiProvider']) {
    setProvider(p);
    setModel(MODEL_DEFAULTS[p]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">AI Provider</label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as AppSettings['aiProvider'])}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              placeholder={MODEL_DEFAULTS[provider]}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
