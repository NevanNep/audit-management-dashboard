import { useMemo } from 'react';
import { complianceIconColor } from '../../utils/statusColors';
import { ISO_STANDARDS } from '../../data/isoStandards';
import type { StandardCardStats } from '../../services/evidenceApi';
import type { ComplianceResult, IsoFilterValue } from '../../types/evidence';

interface IsoStandardCardsProps {
  byStandard: StandardCardStats[];
  selectedIso: IsoFilterValue;
  onSelectIso: (iso: IsoFilterValue) => void;
}

const COMPLIANCE_ORDER: ComplianceResult[] = [
  'Compliant',
  'Partially compliant',
  'Non-compliant',
  'Not assessed',
  'Not applicable',
];

interface CardData {
  filterValue: IsoFilterValue;
  code: string;
  standard: string;
  total: number;
  overdueCount: number;
  segments: { result: ComplianceResult; widthPercent: number }[];
}

function toSegments(total: number, segments: { result: string; count: number }[]): { result: ComplianceResult; widthPercent: number }[] {
  const segmentCounts = new Map(segments.map((segment) => [segment.result, segment.count]));
  const segMax = Math.max(1, total);
  return COMPLIANCE_ORDER.map((result) => ({
    result,
    widthPercent: ((segmentCounts.get(result) ?? 0) / segMax) * 100,
  })).filter((segment) => segment.widthPercent > 0);
}

export function IsoStandardCards({ byStandard, selectedIso, onSelectIso }: IsoStandardCardsProps) {
  const cards = useMemo<CardData[]>(() => {
    const statsByStandard = new Map(byStandard.map((entry) => [entry.standard, entry]));
    const emptyStats: StandardCardStats = { standard: '', total: 0, overdueCount: 0, segments: [] };

    return ISO_STANDARDS.map((std) => {
      const stats = statsByStandard.get(std.standard) ?? emptyStats;
      return {
        filterValue: std.code as IsoFilterValue,
        code: std.standard,
        standard: std.code,
        total: stats.total,
        overdueCount: stats.overdueCount,
        segments: toSegments(stats.total, stats.segments),
      };
    });
  }, [byStandard]);

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {cards.map((card) => {
          const isSelected = selectedIso === card.filterValue;
          return (
            <button
              key={card.filterValue}
              type="button"
              onClick={() => onSelectIso(isSelected ? 'All ISO' : card.filterValue)}
              aria-pressed={isSelected}
              className={`rounded-[10px] border p-3.5 text-left shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
                isSelected
                  ? 'border-[1.5px] border-accent bg-accent-tint'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="mb-0.5 flex items-baseline justify-between gap-1">
                <span className={`text-[13px] font-bold ${isSelected ? 'text-accent' : 'text-slate-900'}`}>
                  {card.code}
                </span>
                <span className="text-[15px] font-bold text-slate-900">{card.total}</span>
              </div>
              <div className="mb-2.5 truncate text-[10.5px] text-slate-400">{card.standard}</div>
              <div className="mb-1 flex h-[5px] overflow-hidden rounded-full bg-slate-100">
                {card.segments.length > 0 ? (
                  card.segments.map((segment) => (
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
              <div className="h-[13px] text-[10.5px] font-semibold text-amber-600">
                {card.overdueCount > 0 ? `${card.overdueCount} overdue` : ''}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
