import { useMemo } from 'react';
import { complianceIconColor } from '../../utils/statusColors';
import type { ComplianceResult, EvidenceDocument } from '../../types/evidence';

interface ComplianceResultChartProps {
  documents: EvidenceDocument[];
}

const COMPLIANCE_RESULT_ORDER: ComplianceResult[] = [
  'Compliant',
  'Partially compliant',
  'Non-compliant',
  'Not applicable',
  'Not assessed',
];

export function ComplianceResultChart({ documents }: ComplianceResultChartProps) {
  const rows = useMemo(() => {
    const counts = COMPLIANCE_RESULT_ORDER.map((result) => ({
      result,
      count: documents.filter((doc) => doc.complianceResult === result).length,
    })).filter((row) => row.count > 0);
    const max = Math.max(1, ...counts.map((row) => row.count));
    return counts.map((row) => ({ ...row, widthPercent: (row.count / max) * 100 }));
  }, [documents]);

  return (
    <div className="min-w-[320px] flex-1 basis-[320px] rounded-[10px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 text-[13px] font-semibold text-slate-800">Documents by compliance result</div>
      {rows.length === 0 ? (
        <p className="text-[12.5px] text-slate-500">No documents match the current filters.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row) => (
            <div key={row.result} className="flex items-center gap-2.5">
              <div className="w-[110px] shrink-0 truncate text-[11.5px] text-slate-600">{row.result}</div>
              <div className="h-[9px] flex-1 overflow-hidden rounded bg-slate-100">
                <div
                  className={`h-full rounded ${complianceIconColor(row.result)}`}
                  style={{ width: `${row.widthPercent}%` }}
                />
              </div>
              <div className="w-5 shrink-0 text-right text-xs font-semibold text-slate-700">{row.count}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
