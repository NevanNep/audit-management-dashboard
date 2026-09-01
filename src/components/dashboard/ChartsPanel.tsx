import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { evidenceDotColor, complianceIconColor } from '../../utils/statusColors';
import type { CountStat } from '../../services/evidenceApi';
import type { EvidenceStatus, ComplianceResult } from '../../types/evidence';

interface ChartsPanelProps {
  evidenceStatusCounts: CountStat[];
  complianceResultCounts: CountStat[];
  stacked?: boolean;
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
      <div className="w-[84px] shrink-0 whitespace-nowrap text-[11px] text-ink-secondary">{label}</div>
      <div className="relative h-[6px] flex-1 overflow-hidden rounded-full bg-subtle">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <div className="w-6 shrink-0 text-right">
        <span className="text-[11.5px] font-semibold tabular-nums text-ink-secondary">{count}</span>
      </div>
    </div>
  );
}

function SectionCard({ title, tooltip, rows }: { title: string; tooltip: string; rows: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-[12px] font-semibold text-ink-secondary">{title}</span>
        <Info className="h-3 w-3 shrink-0 cursor-default text-ink-muted hover:text-ink-secondary" aria-hidden="true">
          <title>{tooltip}</title>
        </Info>
      </div>
      <div>{rows}</div>
    </div>
  );
}

export function ChartsPanel({ evidenceStatusCounts, complianceResultCounts, stacked = false }: ChartsPanelProps) {
  const evidenceRows = useMemo(() => {
    const countByStatus = new Map(evidenceStatusCounts.map((stat) => [stat.value, stat.count]));
    const rows = EVIDENCE_ORDER.map((status) => ({ status, count: countByStatus.get(status) ?? 0 }));
    const max = Math.max(1, ...rows.map((row) => row.count));
    return rows.map((row) => ({ ...row, widthPercent: (row.count / max) * 100 }));
  }, [evidenceStatusCounts]);

  const complianceRows = useMemo(() => {
    const countByResult = new Map(complianceResultCounts.map((stat) => [stat.value, stat.count]));
    const rows = COMPLIANCE_ORDER.map((result) => ({ result, count: countByResult.get(result) ?? 0 }));
    const max = Math.max(1, ...rows.map((row) => row.count));
    return rows.map((row) => ({ ...row, widthPercent: (row.count / max) * 100 }));
  }, [complianceResultCounts]);

  const isEmpty = evidenceRows.every((row) => row.count === 0) && complianceRows.every((row) => row.count === 0);

  const evidenceSection = (
    <SectionCard
      title="Evidence review"
      tooltip="Was the supporting evidence uploaded and reviewed by an auditor?"
      rows={evidenceRows.map((row) => (
        <BarRow
          key={row.status}
          label={EVIDENCE_LABELS[row.status]}
          count={row.count}
          widthPercent={row.widthPercent}
          colorClass={evidenceDotColor(row.status)}
        />
      ))}
    />
  );

  const complianceSection = (
    <SectionCard
      title="Compliance"
      tooltip="Does the document satisfy the ISO control requirement?"
      rows={complianceRows.map((row) => (
        <BarRow
          key={row.result}
          label={COMPLIANCE_LABELS[row.result]}
          count={row.count}
          widthPercent={row.widthPercent}
          colorClass={complianceIconColor(row.result)}
        />
      ))}
    />
  );

  return (
    <div>
      {isEmpty ? (
        <p className="text-[12.5px] text-ink-muted">No documents match current filters.</p>
      ) : stacked ? (
        <div className="space-y-4">
          {evidenceSection}
          {complianceSection}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4">
          {evidenceSection}
          {complianceSection}
        </div>
      )}
    </div>
  );
}
