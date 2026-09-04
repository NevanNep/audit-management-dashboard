import { useMemo } from 'react';
import { complianceIconColor } from '../../utils/statusColors';
import type { CardStats } from '../../services/evidenceApi';
import type { ComplianceResult } from '../../types/evidence';

interface AllStandardsCardProps {
  overall: CardStats;
  isSelected: boolean;
  onSelect: () => void;
}

const COMPLIANCE_ORDER: ComplianceResult[] = [
  'Compliant',
  'Partially compliant',
  'Non-compliant',
  'Not assessed',
  'Not applicable',
];

export function AllStandardsCard({ overall, isSelected, onSelect }: AllStandardsCardProps) {
  const segments = useMemo(() => {
    const segMax = Math.max(1, overall.total);
    const segmentCounts = new Map(overall.segments.map((segment) => [segment.result, segment.count]));
    return COMPLIANCE_ORDER.map((result) => ({
      result,
      widthPercent: ((segmentCounts.get(result) ?? 0) / segMax) * 100,
    })).filter((segment) => segment.widthPercent > 0);
  }, [overall]);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`w-full rounded-[14px] border p-[18px] text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
        isSelected
          ? 'border-[1.5px] border-accent bg-accent-tint'
          : 'border border-border bg-subtle hover:border-border-strong'
      }`}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <span className={`text-[13px] font-semibold ${isSelected ? 'text-accent-hover' : 'text-ink-secondary'}`}>
          All standards
        </span>
        {isSelected && <span className="text-[12px] font-medium text-accent-hover">active</span>}
      </div>

      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-[38px] font-bold leading-none tracking-tight text-ink">{overall.total}</span>
        <span className="text-[13px] text-ink-secondary">documents</span>
      </div>

      <div className="flex h-2 overflow-hidden rounded-full bg-subtle">
        {segments.length > 0 ? (
          segments.map((segment) => (
            <div
              key={segment.result}
              title={segment.result}
              style={{ width: `${segment.widthPercent}%` }}
              className={`h-full ${complianceIconColor(segment.result)}`}
            />
          ))
        ) : (
          <div className="h-full w-full" />
        )}
      </div>
      {overall.overdueCount > 0 && (
        <div className="mt-3 text-[12px] font-semibold text-overdue-fg">{overall.overdueCount} overdue</div>
      )}
    </button>
  );
}
