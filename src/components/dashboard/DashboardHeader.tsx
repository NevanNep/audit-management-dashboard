import { ChevronLeft } from 'lucide-react';

interface DashboardHeaderProps {
  onCollapse: () => void;
}

export function DashboardHeader({ onCollapse }: DashboardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-4">
      <div className="min-w-0">
        <h1 className="text-[18px] font-semibold leading-tight text-ink">Audit Management Dashboard</h1>
        <p className="mt-0.5 text-[11.5px] leading-snug text-ink-muted">ISO management systems</p>
      </div>
      <button
        type="button"
        onClick={onCollapse}
        title="Collapse sidebar"
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border text-ink-muted transition-colors hover:bg-subtle hover:text-ink-secondary focus:outline-none"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
