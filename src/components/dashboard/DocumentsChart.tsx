import { useMemo } from 'react';
import { evidenceDotColor } from '../../utils/statusColors';
import type { CountStat } from '../../services/evidenceApi';
import type { EvidenceStatus } from '../../types/evidence';

interface DocumentsChartProps {
  counts: CountStat[];
}

const EVIDENCE_STATUS_ORDER: EvidenceStatus[] = ['Accepted', 'Pending Review', 'Rejected', 'Missing'];

const LABELS: Record<EvidenceStatus, string> = {
  Accepted: 'Accepted',
  'Pending Review': 'Pending',
  Rejected: 'Rejected',
  Missing: 'Missing',
};

export function DocumentsChart({ counts }: DocumentsChartProps) {
  const rows = useMemo(() => {
    const countByStatus = new Map(counts.map((stat) => [stat.value, stat.count]));
    const rows = EVIDENCE_STATUS_ORDER.map((status) => ({
      status,
      count: countByStatus.get(status) ?? 0,
    }));
    const max = Math.max(1, ...rows.map((row) => row.count));
    return rows.map((row) => ({ ...row, widthPercent: (row.count / max) * 100 }));
  }, [counts]);

  const isEmpty = rows.every((row) => row.count === 0);

  return (
    <div className="flex flex-col rounded-[10px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 text-[13px] font-semibold text-slate-800">Evidence status</div>
      {isEmpty ? (
        <p className="text-[12.5px] text-slate-500">No documents match the current filters.</p>
      ) : (
        <div className="flex flex-1 flex-col justify-center space-y-2.5">
          {rows.map((row) => (
            <div key={row.status} className="flex items-center gap-2.5">
              <div className="w-[70px] shrink-0 truncate text-[11.5px] text-slate-600">{LABELS[row.status]}</div>
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
