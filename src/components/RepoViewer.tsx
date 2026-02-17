'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { RepoSource } from '../../shared/types';

interface RepoViewerProps {
  source: RepoSource;
  filePath: string;
  onClose: () => void;
  initialContent?: string;
}

export function RepoViewer({ source, filePath, onClose, initialContent }: RepoViewerProps) {
  const [content, setContent] = useState<string | null>(initialContent ?? null);
  const [loading, setLoading] = useState(!initialContent);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialContent !== undefined) return;
    setLoading(true);
    setError(null);
    api
      .readRepoFile(source, filePath)
      .then((res) => setContent(res.content))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load file'))
      .finally(() => setLoading(false));
  }, [filePath, source, initialContent]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-3xl max-h-[80vh] rounded-xl border border-border bg-surface flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <FileText className="h-4 w-4 text-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{filePath}</p>
            <p className="text-xs text-muted">
              {source.type === 'github' ? `GitHub: ${source.repo}` : `Local: ${source.path}`}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : error ? (
            <div className="p-4 text-center text-error text-sm">{error}</div>
          ) : (
            <pre className="p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
