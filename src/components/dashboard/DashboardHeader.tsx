import { ChevronLeft } from 'lucide-react';

interface DashboardHeaderProps {
  onCollapse: () => void;
}

export function DashboardHeader({ onCollapse }: DashboardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-border px-5 pb-4 pt-5">
      <div className="min-w-0">
        <h1 className="text-[19px] font-bold leading-[1.2] tracking-tight text-ink">Audit Management Dashboard</h1>
        <p className="mt-1 text-[12px] leading-snug text-ink-muted">ISO management systems</p>
      </div>
      <button
        type="button"
        onClick={onCollapse}
        title="Collapse sidebar"
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-ink-muted transition-colors hover:bg-subtle hover:text-ink-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
