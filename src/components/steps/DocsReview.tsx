'use client';

import { useState, useEffect } from 'react';
import { useProjectStore } from '@/hooks/useProject';
import { api } from '@/lib/api';
import { ApprovalGate } from '../ApprovalGate';
import { FileText, Code2, Shield, Loader2, ChevronDown, ChevronRight, Plus, Trash2, Pencil, Check } from 'lucide-react';
import clsx from 'clsx';
import type { GeneratedDocs, PromptPolicy } from '../../../shared/types';
import { getTemplatesForStack } from '../../../shared/rule-templates';

type DocTab = keyof GeneratedDocs;

const TABS: { key: DocTab; label: string; filename: string }[] = [
  { key: 'readme', label: 'README', filename: 'README.md' },
  { key: 'roadmap', label: 'ROADMAP', filename: 'ROADMAP.md' },
  { key: 'gettingStarted', label: 'Getting Started', filename: 'GETTING_STARTED.md' },
  { key: 'featureList', label: 'Features', filename: 'FEATURES.md' },
];

const POLICY_SECTIONS: { key: keyof PromptPolicy; label: string; type: 'string' | 'array' }[] = [
  { key: 'projectOverview', label: 'Project Overview', type: 'string' },
  { key: 'techConventions', label: 'Tech Stack & Conventions', type: 'string' },
  { key: 'codeStyleRules', label: 'Code Style Rules', type: 'array' },
  { key: 'architectureRules', label: 'Architecture Rules', type: 'array' },
  { key: 'dos', label: "Do's", type: 'array' },
  { key: 'donts', label: "Don'ts", type: 'array' },
  { key: 'testingGuidelines', label: 'Testing Guidelines', type: 'string' },
  { key: 'dependenciesPolicy', label: 'Dependencies Policy', type: 'string' },
];

function renderAiRules(policy: PromptPolicy): string {
  return `# AI Rules

Instructions for AI coding assistants working on this project.

## Project Overview
${policy.projectOverview}

## Tech Stack & Conventions
${policy.techConventions}

## Code Style Rules
${policy.codeStyleRules.map((r) => `- ${r}`).join('\n')}

## Architecture Rules
${policy.architectureRules.map((r) => `- ${r}`).join('\n')}

## Do's
${policy.dos.map((r) => `- ${r}`).join('\n')}

## Don'ts
${policy.donts.map((r) => `- ${r}`).join('\n')}

## Testing Guidelines
${policy.testingGuidelines}

## Dependencies Policy
${policy.dependenciesPolicy}
`;
}

function EditableList({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState('');

  function startEdit(i: number) {
    setEditingIdx(i);
    setEditValue(items[i]);
  }

  function saveEdit() {
    if (editingIdx === null) return;
    const updated = [...items];
    updated[editingIdx] = editValue;
    onChange(updated);
    setEditingIdx(null);
  }

  function removeItem(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  function addItem() {
    if (!newValue.trim()) return;
    onChange([...items, newValue.trim()]);
    setNewValue('');
    setAdding(false);
  }

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 group">
          {editingIdx === i ? (
            <div className="flex-1 flex gap-1">
              <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
                autoFocus
              />
              <button onClick={saveEdit} className="text-success hover:text-success/80">
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <span className="flex-1 text-xs leading-relaxed">- {item}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(i)} className="text-muted hover:text-foreground">
                  <Pencil className="h-3 w-3" />
                </button>
                <button onClick={() => removeItem(i)} className="text-muted hover:text-error">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </>
          )}
        </div>
      ))}
      {adding ? (
        <div className="flex gap-1">
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder="New rule..."
            className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
            autoFocus
          />
          <button onClick={addItem} className="text-success hover:text-success/80">
            <Check className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors mt-1"
        >
          <Plus className="h-3 w-3" /> Add rule
        </button>
      )}
    </div>
  );
}

export function DocsReview() {
  const { project, setProject, addLog, updateDocs, updateScaffold, updatePolicy } = useProjectStore();
  const docs = project?.docs;
  const scaffold = project?.scaffold;
  const policy = project?.policy;
  const [activeTab, setActiveTab] = useState<DocTab>('readme');
  const [generatingDocs, setGeneratingDocs] = useState(false);
  const [generatingScaffold, setGeneratingScaffold] = useState(false);
  const [generatingPolicy, setGeneratingPolicy] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [scaffoldOpen, setScaffoldOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionEditValue, setSectionEditValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<number | null>(null);

  useEffect(() => {
    if (project?.plan && project?.repoResult) {
      if (!docs) generateDocs();
      if (!scaffold) generateScaffold();
      if (!policy) generatePolicy();
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

  async function generatePolicy() {
    if (!project?.plan) return;
    setGeneratingPolicy(true);
    addLog({ level: 'info', step: 'docs', message: 'Generating AI rules...' });

    try {
      // Gather pre-existing rules from templates + user presets
      const templateRules = getTemplatesForStack(project.plan.techStack);
      const presetRules = project.settings.rulePresets ?? [];

      // Merge template + preset rules into a text summary for the AI to build upon
      const existingLines: string[] = [];
      if (templateRules.codeStyleRules?.length) {
        existingLines.push('Code style: ' + templateRules.codeStyleRules.join('; '));
      }
      if (templateRules.architectureRules?.length) {
        existingLines.push('Architecture: ' + templateRules.architectureRules.join('; '));
      }
      if (templateRules.dos?.length) {
        existingLines.push("Do's: " + templateRules.dos.join('; '));
      }
      if (templateRules.donts?.length) {
        existingLines.push("Don'ts: " + templateRules.donts.join('; '));
      }
      for (const preset of presetRules) {
        const rules = preset.rules;
        if (rules.codeStyleRules?.length) existingLines.push(`[${preset.name}] Style: ` + rules.codeStyleRules.join('; '));
        if (rules.dos?.length) existingLines.push(`[${preset.name}] Do's: ` + rules.dos.join('; '));
        if (rules.donts?.length) existingLines.push(`[${preset.name}] Don'ts: ` + rules.donts.join('; '));
      }

      const generated = await api.generatePolicy(
        project.plan,
        project.settings,
        existingLines.join('\n') || undefined
      );

      // Merge: AI-generated rules + template rules + preset rules (deduplicated)
      const merged = mergePolicy(generated, templateRules, presetRules.flatMap((p) => Object.values(p.rules)));
      updatePolicy(merged);
      addLog({ level: 'success', step: 'docs', message: 'AI rules generated' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI rules generation failed';
      addLog({ level: 'error', step: 'docs', message });
    } finally {
      setGeneratingPolicy(false);
    }
  }

  function mergePolicy(
    aiGenerated: PromptPolicy,
    templateRules: Partial<PromptPolicy>,
    _presetFragments: unknown[]
  ): PromptPolicy {
    // For array fields, combine AI + template rules and deduplicate
    function mergeArrays(ai: string[], template?: string[]): string[] {
      const combined = [...ai, ...(template ?? [])];
      const seen = new Set<string>();
      return combined.filter((r) => {
        const key = r.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    return {
      projectOverview: aiGenerated.projectOverview,
      techConventions: aiGenerated.techConventions,
      codeStyleRules: mergeArrays(aiGenerated.codeStyleRules, templateRules.codeStyleRules),
      architectureRules: mergeArrays(aiGenerated.architectureRules, templateRules.architectureRules),
      dos: mergeArrays(aiGenerated.dos, templateRules.dos),
      donts: mergeArrays(aiGenerated.donts, templateRules.donts),
      testingGuidelines: aiGenerated.testingGuidelines,
      dependenciesPolicy: aiGenerated.dependenciesPolicy,
    };
  }

  function handlePolicyChange(key: keyof PromptPolicy, value: string | string[]) {
    if (!policy) return;
    updatePolicy({ ...policy, [key]: value });
  }

  function startSectionEdit(key: string) {
    if (!policy) return;
    setEditingSection(key);
    setSectionEditValue(policy[key as keyof PromptPolicy] as string);
  }

  function saveSectionEdit(key: string) {
    if (!policy) return;
    updatePolicy({ ...policy, [key]: sectionEditValue });
    setEditingSection(null);
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
      const docFiles = TABS.map((tab) => ({
        path: tab.filename,
        content: docs[tab.key],
      }));
      const scaffoldFiles = scaffold?.files ?? [];
      const policyFile = policy ? [{ path: 'AI_RULES.md', content: renderAiRules(policy) }] : [];
      const allFiles = [...scaffoldFiles, ...docFiles, ...policyFile];

      await api.commitFiles(
        project.repoResult.fullName,
        allFiles,
        'feat: add app scaffold, documentation, and AI rules'
      );

      const updated = {
        ...project,
        docs,
        scaffold: scaffold ?? null,
        policy: policy ?? null,
        currentStep: 'deploy' as const,
        updatedAt: new Date().toISOString(),
        steps: {
          ...project.steps,
          docs: { ...project.steps.docs, status: 'completed' as const, approvedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
          deploy: { ...project.steps.deploy, status: 'active' as const },
        },
      };

      setProject(updated);
      addLog({ level: 'success', step: 'docs', message: 'All files committed to repository' });
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

  const isGenerating = generatingDocs || generatingScaffold || generatingPolicy;

  if (isGenerating && !docs && !scaffold && !policy) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent mb-4" />
        <p className="text-muted text-sm">Generating docs, scaffold, and AI rules...</p>
      </div>
    );
  }

  if (!docs && !scaffold && !policy) {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        <p className="text-muted mb-4">No documentation generated yet.</p>
        <button
          onClick={() => { generateDocs(); generateScaffold(); generatePolicy(); }}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Generate All
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
            onClick={() => { generateDocs(); generateScaffold(); generatePolicy(); }}
            disabled={isGenerating}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-foreground transition-colors disabled:opacity-50"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* App Scaffold Section */}
      <div className="mb-4 rounded-lg border border-border bg-surface overflow-hidden">
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

      {/* AI Rules Section */}
      <div className="mb-4 rounded-lg border border-border bg-surface overflow-hidden">
        <button
          onClick={() => setPolicyOpen(!policyOpen)}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-surface-hover transition-colors"
        >
          {policyOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Shield className="h-4 w-4 text-accent" />
          <span>AI Rules (AI_RULES.md)</span>
          {policy ? (
            <span className="ml-auto text-xs text-muted">
              {policy.codeStyleRules.length + policy.architectureRules.length + policy.dos.length + policy.donts.length} rules
            </span>
          ) : generatingPolicy ? (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-muted">
              <Loader2 className="h-3 w-3 animate-spin" /> Generating...
            </span>
          ) : (
            <span className="ml-auto text-xs text-warning">Not generated</span>
          )}
        </button>

        {policyOpen && policy && (
          <div className="border-t border-border divide-y divide-border/50">
            {POLICY_SECTIONS.map((section) => (
              <div key={section.key} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">
                    {section.label}
                  </h4>
                  {section.type === 'string' && editingSection !== section.key && (
                    <button
                      onClick={() => startSectionEdit(section.key)}
                      className="text-muted hover:text-foreground"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {section.type === 'string' ? (
                  editingSection === section.key ? (
                    <div className="space-y-2">
                      <textarea
                        value={sectionEditValue}
                        onChange={(e) => setSectionEditValue(e.target.value)}
                        rows={4}
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground font-mono focus:border-accent focus:outline-none resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveSectionEdit(section.key)}
                          className="rounded bg-accent px-2 py-1 text-xs text-white hover:bg-accent-hover"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingSection(null)}
                          className="rounded border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed">
                      {policy[section.key] as string}
                    </p>
                  )
                ) : (
                  <EditableList
                    items={policy[section.key] as string[]}
                    onChange={(items) => handlePolicyChange(section.key, items)}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {policyOpen && !policy && !generatingPolicy && (
          <div className="border-t border-border p-4 text-center">
            <button
              onClick={generatePolicy}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
            >
              Generate AI Rules
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
        warning="This will commit the app scaffold, documentation, and AI rules to your GitHub repository."
        approveLabel="Commit All Files"
        onApprove={handleApprove}
        onBack={handleBack}
        loading={committing}
      />
    </div>
  );
}
