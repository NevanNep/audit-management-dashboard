import { useMemo } from 'react';
import { evidenceDotColor } from '../../utils/statusColors';
import type { EvidenceDocument, EvidenceStatus } from '../../types/evidence';

interface DocumentsChartProps {
  documents: EvidenceDocument[];
}

const EVIDENCE_STATUS_ORDER: EvidenceStatus[] = [
  'Requested',
  'Uploaded',
  'Under review',
  'Accepted',
  'Need revision',
];

export function DocumentsChart({ documents }: DocumentsChartProps) {
  const rows = useMemo(() => {
    const counts = EVIDENCE_STATUS_ORDER.map((status) => ({
      status,
      count: documents.filter((doc) => doc.evidenceStatus === status).length,
    })).filter((row) => row.count > 0);
    const max = Math.max(1, ...counts.map((row) => row.count));
    return counts.map((row) => ({ ...row, widthPercent: (row.count / max) * 100 }));
  }, [documents]);

  return (
    <div className="mb-6 max-w-[480px] rounded-[10px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 text-[13px] font-semibold text-slate-800">Documents by evidence status</div>
      {rows.length === 0 ? (
        <p className="text-[12.5px] text-slate-500">No documents match the current filters.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row) => (
            <div key={row.status} className="flex items-center gap-2.5">
              <div className="w-[110px] shrink-0 truncate text-[11.5px] text-slate-600">{row.status}</div>
              <div className="h-[9px] flex-1 overflow-hidden rounded bg-slate-100">
                <div
                  className={`h-full rounded ${evidenceDotColor(row.status)}`}
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
