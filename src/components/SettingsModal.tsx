'use client';

import { useState } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useProjectStore } from '@/hooks/useProject';
import type { AppSettings, RulePreset } from '../../shared/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MODEL_DEFAULTS: Record<string, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
};

function PresetEditor({
  preset,
  onChange,
  onDelete,
}: {
  preset: RulePreset;
  onChange: (preset: RulePreset) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rules = preset.rules;

  function updateArray(field: string, items: string[]) {
    onChange({ ...preset, rules: { ...rules, [field]: items } });
  }

  function addItem(field: string) {
    const current = (rules[field as keyof typeof rules] as string[] | undefined) ?? [];
    updateArray(field, [...current, '']);
  }

  function updateItem(field: string, index: number, value: string) {
    const current = [...((rules[field as keyof typeof rules] as string[] | undefined) ?? [])];
    current[index] = value;
    updateArray(field, current);
  }

  function removeItem(field: string, index: number) {
    const current = (rules[field as keyof typeof rules] as string[] | undefined) ?? [];
    updateArray(field, current.filter((_, i) => i !== index));
  }

  const sections = [
    { key: 'codeStyleRules', label: 'Code Style Rules' },
    { key: 'architectureRules', label: 'Architecture Rules' },
    { key: 'dos', label: "Do's" },
    { key: 'donts', label: "Don'ts" },
  ];

  return (
    <div className="rounded-lg border border-border bg-background/50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 flex-1 text-left">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <input
            value={preset.name}
            onChange={(e) => onChange({ ...preset, name: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-transparent text-sm font-medium text-foreground focus:outline-none"
            placeholder="Preset name"
          />
        </button>
        <button onClick={onDelete} className="text-muted hover:text-error transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="border-t border-border px-3 py-2 space-y-3">
          {sections.map((section) => {
            const items = (rules[section.key as keyof typeof rules] as string[] | undefined) ?? [];
            return (
              <div key={section.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted">{section.label}</span>
                  <button
                    onClick={() => addItem(section.key)}
                    className="text-xs text-muted hover:text-accent flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
                {items.map((item, i) => (
                  <div key={i} className="flex gap-1 mb-1">
                    <input
                      value={item}
                      onChange={(e) => updateItem(section.key, i, e.target.value)}
                      className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
                      placeholder="Enter a rule..."
                    />
                    <button
                      onClick={() => removeItem(section.key, i)}
                      className="text-muted hover:text-error"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-xs text-muted/50 italic">No rules yet</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);

  const [provider, setProvider] = useState<AppSettings['aiProvider']>(
    project?.settings.aiProvider ?? 'openai'
  );
  const [model, setModel] = useState(project?.settings.model ?? 'gpt-4o');
  const [presets, setPresets] = useState<RulePreset[]>(project?.settings.rulePresets ?? []);

  if (!isOpen) return null;

  function handleSave() {
    if (!project) return;
    // Filter out empty rules from presets
    const cleanedPresets = presets
      .filter((p) => p.name.trim())
      .map((p) => ({
        ...p,
        rules: Object.fromEntries(
          Object.entries(p.rules).filter(([, v]) => Array.isArray(v) ? v.some((s) => s.trim()) : !!v)
        ),
      }));

    setProject({
      ...project,
      settings: { aiProvider: provider, model, rulePresets: cleanedPresets },
      updatedAt: new Date().toISOString(),
    });
    onClose();
  }

  function handleProviderChange(p: AppSettings['aiProvider']) {
    setProvider(p);
    setModel(MODEL_DEFAULTS[p]);
  }

  function addPreset() {
    setPresets([
      ...presets,
      {
        id: crypto.randomUUID(),
        name: '',
        rules: { codeStyleRules: [], dos: [], donts: [] },
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function updatePreset(index: number, preset: RulePreset) {
    const updated = [...presets];
    updated[index] = preset;
    setPresets(updated);
  }

  function deletePreset(index: number) {
    setPresets(presets.filter((_, i) => i !== index));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg max-h-[80vh] rounded-xl border border-border bg-surface p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* AI Provider Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted uppercase tracking-wider">AI Provider</h3>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Provider</label>
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

          {/* Rule Presets Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted uppercase tracking-wider">Rule Presets</h3>
              <button
                onClick={addPreset}
                className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> New Preset
              </button>
            </div>
            <p className="text-xs text-muted">
              Custom rule sets applied to AI Rules generation for all projects.
            </p>

            {presets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <p className="text-xs text-muted mb-2">No presets yet</p>
                <button
                  onClick={addPreset}
                  className="rounded bg-accent px-3 py-1 text-xs text-white hover:bg-accent-hover"
                >
                  Create Your First Preset
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {presets.map((preset, i) => (
                  <PresetEditor
                    key={preset.id}
                    preset={preset}
                    onChange={(p) => updatePreset(i, p)}
                    onDelete={() => deletePreset(i)}
                  />
                ))}
              </div>
            )}
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
