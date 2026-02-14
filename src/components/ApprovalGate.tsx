'use client';

import { AlertTriangle } from 'lucide-react';

interface ApprovalGateProps {
  warning: string;
  approveLabel?: string;
  onApprove: () => void;
  onBack: () => void;
  loading?: boolean;
}

export function ApprovalGate({
  warning,
  approveLabel = 'Approve & Continue',
  onApprove,
  onBack,
  loading = false,
}: ApprovalGateProps) {
  return (
    <div className="mt-6 rounded-lg border border-warning/30 bg-warning/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div className="flex-1">
          <p className="text-sm text-foreground">{warning}</p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={onApprove}
              disabled={loading}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? 'Processing...' : approveLabel}
            </button>
            <button
              onClick={onBack}
              disabled={loading}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
