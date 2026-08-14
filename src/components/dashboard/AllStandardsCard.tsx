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

const LABELS: Record<ComplianceResult, string> = {
  Compliant: 'Compliant',
  'Partially compliant': 'Partially',
  'Non-compliant': 'Non-comp.',
  'Not assessed': 'Not assessed',
  'Not applicable': 'Not applic.',
};

export function AllStandardsCard({ overall, evidenceStatusCounts, isSelected, onSelect }: AllStandardsCardProps) {
  const legend = useMemo(() => {
    const segmentCounts = new Map(overall.segments.map((segment) => [segment.result, segment.count]));
    return COMPLIANCE_ORDER.map((result) => ({
      result,
      count: segmentCounts.get(result) ?? 0,
    }));
  }, [overall]);

  const segments = useMemo(() => {
    const segMax = Math.max(1, overall.total);
    return legend
      .map((item) => ({ result: item.result, widthPercent: (item.count / segMax) * 100 }))
      .filter((segment) => segment.widthPercent > 0);
  }, [legend, overall.total]);

  const pendingCount = evidenceStatusCounts.find((stat) => stat.value === 'Pending Review')?.count ?? 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`flex flex-col rounded-[10px] border p-5 text-left shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
        isSelected ? 'border-[1.5px] border-accent bg-accent-tint' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className={`text-[13px] font-semibold ${isSelected ? 'text-accent' : 'text-slate-800'}`}>
          All standards
        </span>
        <div className="flex items-center gap-3 text-[11.5px] font-semibold">
          {overall.overdueCount > 0 && <span className="text-amber-600">{overall.overdueCount} overdue</span>}
          {pendingCount > 0 && <span className="text-slate-500">{pendingCount} pending</span>}
        </div>
      </div>

      <div className="mb-4 flex items-end gap-1.5">
        <span className="text-[32px] font-bold leading-none text-slate-900">{overall.total}</span>
        <span className="pb-0.5 text-[13px] text-slate-500">documents</span>
      </div>

      <div className="mb-4 flex flex-1 flex-col justify-center border-t border-slate-100 pt-3.5">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          By compliance result
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {legend.map((item) => (
            <div key={item.result} className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-slate-600">
              <span className={`h-2 w-2 shrink-0 rounded-full ${complianceIconColor(item.result)}`} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{LABELS[item.result]}</span>
              <span className="shrink-0 font-semibold text-slate-700">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
        {segments.length > 0 ? (
          segments.map((segment) => (
            <div
              key={segment.result}
              style={{ width: `${segment.widthPercent}%` }}
              className={`h-full ${complianceIconColor(segment.result)}`}
            />
          ))
        ) : (
          <div className="h-full w-full bg-slate-100" />
        )}
      </div>
    </button>
  );
}
