'use client';

import { useProjectStore } from '@/hooks/useProject';
import { useEffect, useRef } from 'react';
import { ScrollText, X } from 'lucide-react';
import clsx from 'clsx';
import type { LogEntry } from '../../shared/types';

const LEVEL_COLORS: Record<LogEntry['level'], string> = {
  info: 'text-accent',
  warn: 'text-warning',
  error: 'text-error',
  success: 'text-success',
};

const LEVEL_DOTS: Record<LogEntry['level'], string> = {
  info: 'bg-accent',
  warn: 'bg-warning',
  error: 'bg-error',
  success: 'bg-success',
};

interface LogPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogPanel({ isOpen, onClose }: LogPanelProps) {
  const logs = useProjectStore((s) => s.logs);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  if (!isOpen) return null;

  return (
    <aside className="flex h-full w-80 flex-col border-l border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-muted" />
          <h2 className="text-sm font-medium">Activity Log</h2>
        </div>
        <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {logs.length === 0 ? (
          <p className="text-center text-xs text-muted py-8">No activity yet</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="rounded-md bg-background p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className={clsx('h-1.5 w-1.5 rounded-full', LEVEL_DOTS[log.level])} />
                  <span className="text-muted">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={clsx('ml-auto font-mono text-[10px]', LEVEL_COLORS[log.level])}>
                    {log.step}
                  </span>
                </div>
                <p className="mt-1 text-foreground">{log.message}</p>
                {log.detail && <p className="mt-0.5 text-muted">{log.detail}</p>}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </aside>
  );
}
