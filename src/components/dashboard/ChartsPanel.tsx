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
  'Non-compliant': 'Non-comp.',
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
    <div className="flex items-center gap-2 px-2 py-[5px]">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colorClass}`} />
      <div className="w-[60px] shrink-0 truncate text-[12px] text-slate-500">{label}</div>
      <div className="relative h-[10px] flex-1 overflow-hidden rounded-full border border-slate-200 bg-white shadow-[inset_0_1px_2px_0_rgb(0,0,0,0.04)]">
        <div
          className={`h-full rounded-full opacity-80 transition-all duration-300 ${colorClass}`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <div className="w-6 shrink-0 text-right">
        <span className="text-[11.5px] font-semibold tabular-nums text-slate-700">{count}</span>
      </div>
    </div>
  );
}

function SectionCard({ title, tooltip, rows }: { title: string; tooltip: string; rows: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
      <div className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-2">
        <span className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">{title}</span>
        <Info className="h-3 w-3 shrink-0 cursor-default text-slate-300 hover:text-slate-400" aria-hidden="true">
          <title>{tooltip}</title>
        </Info>
      </div>
      <div className="px-1 py-1.5">{rows}</div>
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
      title="Evidence"
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
    <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-3">
      <div className="mb-0.5 text-[12.5px] font-semibold text-slate-700">Document health</div>
      <p className="mb-3 text-[11.5px] leading-snug text-slate-400">Evidence reviewed · compliance satisfied</p>

      {isEmpty ? (
        <p className="text-[12.5px] text-slate-400">No documents match current filters.</p>
      ) : stacked ? (
        <div className="space-y-2.5">
          {evidenceSection}
          {complianceSection}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3">
          {evidenceSection}
          {complianceSection}
        </div>
      )}
    </div>
  );
}
