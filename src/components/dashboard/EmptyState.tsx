interface EmptyStateProps {
  onReset: () => void;
}

export function EmptyState({ onReset }: EmptyStateProps) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mb-1.5 text-[14px] font-semibold text-ink">No documents match your filters</div>
      <p className="mb-4 text-[13px] text-ink-secondary">
        Try a different ISO standard, location, evidence status, or compliance result.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="rounded-md border border-border-strong bg-surface px-4.5 py-2 text-[13px] font-semibold text-ink-secondary hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
      >
        Reset filters
      </button>
    </div>
  );
}
