import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { evidenceDotColor, complianceIconColor } from '../../utils/statusColors';
import type { CountStat } from '../../services/evidenceApi';
import type { EvidenceStatus, ComplianceResult } from '../../types/evidence';

interface ChartsPanelProps {
  evidenceStatusCounts: CountStat[];
  complianceResultCounts: CountStat[];
}

const EVIDENCE_ORDER: EvidenceStatus[] = ['Accepted', 'Pending Review', 'Rejected', 'Missing'];
const EVIDENCE_LABELS: Record<EvidenceStatus, string> = {
  Accepted: 'Accepted',
  'Pending Review': 'Pending',
  Rejected: 'Rejected',
  Missing: 'Missing',
};

const COMPLIANCE_ORDER: ComplianceResult[] = [
  'Compliant',
  'Partially compliant',
  'Non-compliant',
  'Not assessed',
  'Not applicable',
];
const COMPLIANCE_LABELS: Record<ComplianceResult, string> = {
  Compliant: 'Compliant',
  'Partially compliant': 'Partial',
  'Non-compliant': 'Non-compliant',
  'Not assessed': 'Not assessed',
  'Not applicable': 'N/A',
};

// Same shared state palette as everywhere else, but "Not applicable" gets a lighter
// grey than "Not assessed" so the two neutral states stay distinguishable in the bar.
function complianceSwatch(result: ComplianceResult): string {
  return result === 'Not applicable' ? 'bg-slate-300' : complianceIconColor(result);
}

function SectionHeader({ title, tooltip }: { title: string; tooltip: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <span className="text-[13px] font-semibold text-ink-secondary">{title}</span>
      <Info className="h-3 w-3 shrink-0 cursor-default text-ink-muted hover:text-ink-secondary" aria-hidden="true">
        <title>{tooltip}</title>
      </Info>
    </div>
  );
}

function BarRow({
  label,
  count,
  widthPercent,
  colorClass,
}: {
  label: string;
  count: number;
  widthPercent: number;
  colorClass: string;
}) {
  return (
    <div className="flex items-center gap-2 py-[3px]">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colorClass}`} />
      <div className="w-[74px] shrink-0 whitespace-nowrap text-[11.5px] text-ink-secondary">{label}</div>
      <div className="relative h-[6px] flex-1 overflow-hidden rounded-full bg-subtle">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <div className="w-6 shrink-0 text-right">
        <span className="text-[12px] font-semibold tabular-nums text-ink">{count}</span>
      </div>
    </div>
  );
}

function LegendRow({ label, count, colorClass }: { label: string; count: number; colorClass: string }) {
  return (
    <div className="flex items-center gap-2 py-[3px]">
      <span className={`h-2 w-2 shrink-0 rounded-full ${colorClass}`} />
      <div className="flex-1 whitespace-nowrap text-[11.5px] text-ink-secondary">{label}</div>
      <div className="shrink-0 text-right">
        <span className="text-[12px] font-semibold tabular-nums text-ink">{count}</span>
      </div>
    </div>
  );
}

export function ChartsPanel({ evidenceStatusCounts, complianceResultCounts }: ChartsPanelProps) {
  const evidenceRows = useMemo(() => {
    const countByStatus = new Map(evidenceStatusCounts.map((stat) => [stat.value, stat.count]));
    const rows = EVIDENCE_ORDER.map((status) => ({ status, count: countByStatus.get(status) ?? 0 }));
    const max = Math.max(1, ...rows.map((row) => row.count));
    return rows.map((row) => ({ ...row, widthPercent: (row.count / max) * 100 }));
  }, [evidenceStatusCounts]);

  const complianceRows = useMemo(() => {
    const countByResult = new Map(complianceResultCounts.map((stat) => [stat.value, stat.count]));
    return COMPLIANCE_ORDER.map((result) => ({ result, count: countByResult.get(result) ?? 0 }));
  }, [complianceResultCounts]);

  const complianceTotal = complianceRows.reduce((sum, row) => sum + row.count, 0);
  const complianceSegments = complianceRows
    .filter((row) => row.count > 0)
    .map((row) => ({ result: row.result, widthPercent: (row.count / Math.max(1, complianceTotal)) * 100 }));

  const isEmpty =
    evidenceRows.every((row) => row.count === 0) && complianceRows.every((row) => row.count === 0);

  if (isEmpty) {
    return <p className="text-[12.5px] text-ink-muted">No documents match current filters.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <SectionHeader
          title="Evidence review"
          tooltip="Was the supporting evidence uploaded and reviewed by an auditor?"
        />
        <div>
          {evidenceRows.map((row) => (
            <BarRow
              key={row.status}
              label={EVIDENCE_LABELS[row.status]}
              count={row.count}
              widthPercent={row.widthPercent}
              colorClass={evidenceDotColor(row.status)}
            />
          ))}
        </div>
      </div>

      <div>
        <SectionHeader title="Compliance" tooltip="Does the document satisfy the ISO control requirement?" />
        <div className="mb-2 flex h-2 overflow-hidden rounded-full bg-subtle">
          {complianceSegments.length > 0 ? (
            complianceSegments.map((segment) => (
              <div
                key={segment.result}
                title={COMPLIANCE_LABELS[segment.result]}
                style={{ width: `${segment.widthPercent}%` }}
                className={`h-full ${complianceSwatch(segment.result)}`}
              />
            ))
          ) : (
            <div className="h-full w-full" />
          )}
        </div>
        <div>
          {complianceRows.map((row) => (
            <LegendRow
              key={row.result}
              label={COMPLIANCE_LABELS[row.result]}
              count={row.count}
              colorClass={complianceSwatch(row.result)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
