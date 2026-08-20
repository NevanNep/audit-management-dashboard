import { useMemo } from 'react';
import { complianceIconColor } from '../../utils/statusColors';
import type { CardStats, CountStat } from '../../services/evidenceApi';
import type { ComplianceResult } from '../../types/evidence';

interface AllStandardsCardProps {
  overall: CardStats;
  evidenceStatusCounts: CountStat[];
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

export function AllStandardsCard({ overall, evidenceStatusCounts, isSelected, onSelect }: AllStandardsCardProps) {
  const segments = useMemo(() => {
    const segMax = Math.max(1, overall.total);
    const segmentCounts = new Map(overall.segments.map((segment) => [segment.result, segment.count]));
    return COMPLIANCE_ORDER.map((result) => ({
      result,
      widthPercent: ((segmentCounts.get(result) ?? 0) / segMax) * 100,
    })).filter((segment) => segment.widthPercent > 0);
  }, [overall]);

  const pendingCount = evidenceStatusCounts.find((stat) => stat.value === 'Pending Review')?.count ?? 0;
  const acceptedCount = evidenceStatusCounts.find((stat) => stat.value === 'Accepted')?.count ?? 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`w-full rounded-[10px] border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
        isSelected ? 'border-[1.5px] border-accent bg-accent-tint' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-[12.5px] font-semibold ${isSelected ? 'text-accent-hover' : 'text-slate-600'}`}>
          All standards
        </span>
        {isSelected && <span className="text-[11px] font-medium text-accent-hover">active</span>}
      </div>

      <div className="mb-2 flex items-baseline gap-1.5">
        <span className="text-[32px] font-bold leading-none text-slate-900">{overall.total}</span>
        <span className="text-[13px] text-slate-500">documents</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] font-semibold">
        <span className="text-emerald-700">{acceptedCount} accepted</span>
        {pendingCount > 0 && <span className="text-amber-700">{pendingCount} pending</span>}
        {overall.overdueCount > 0 && <span className="text-rose-700">{overall.overdueCount} overdue</span>}
      </div>

      <div className="flex h-2 overflow-hidden rounded-full bg-slate-200">
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
      <p className="mt-1 text-[10px] text-slate-400">Compliance breakdown</p>
    </button>
  );
}
