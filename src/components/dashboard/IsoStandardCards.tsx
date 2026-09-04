import { useMemo, useState } from 'react';
import { ChevronRight, Info } from 'lucide-react';
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

// Shown above the list. The four assessed/known states — "Not applicable" is omitted to keep it to one short line.
const LEGEND: { result: ComplianceResult; label: string }[] = [
  { result: 'Compliant', label: 'Compliant' },
  { result: 'Partially compliant', label: 'Partial' },
  { result: 'Non-compliant', label: 'Non-compliant' },
  { result: 'Not assessed', label: 'Not assessed' },
];

interface CardData {
  filterValue: IsoFilterValue;
  code: string;
  standard: string;
  shortName: string;
  total: number;
  issueCount: number;
  riskScore: number;
  segments: { result: ComplianceResult; widthPercent: number }[];
}

function toSegments(
  total: number,
  segments: { result: string; count: number }[],
): { result: ComplianceResult; widthPercent: number }[] {
  const segmentCounts = new Map(segments.map((segment) => [segment.result, segment.count]));
  const segMax = Math.max(1, total);
  return COMPLIANCE_ORDER.map((result) => ({
    result,
    widthPercent: ((segmentCounts.get(result) ?? 0) / segMax) * 100,
  })).filter((segment) => segment.widthPercent > 0);
}

// Documents that are non-compliant or only partially compliant — what "Sort risk" ranks by.
function issueCount(segments: StandardCardStats['segments']): number {
  return segments
    .filter((segment) => segment.result === 'Non-compliant' || segment.result === 'Partially compliant')
    .reduce((sum, segment) => sum + segment.count, 0);
}

export function IsoStandardCards({ byStandard, selectedIso, onSelectIso }: IsoStandardCardsProps) {
  const [sortByRisk, setSortByRisk] = useState(false);

  const cards = useMemo<CardData[]>(() => {
    const statsByStandard = new Map(byStandard.map((entry) => [entry.standard, entry]));
    const emptyStats: StandardCardStats = { standard: '', total: 0, overdueCount: 0, segments: [] };

    const raw = ISO_STANDARDS.map((std) => {
      const stats = statsByStandard.get(std.standard) ?? emptyStats;
      const issues = issueCount(stats.segments);
      return {
        filterValue: std.code as IsoFilterValue,
        code: std.standard,
        standard: std.code,
        shortName: std.shortName,
        total: stats.total,
        issueCount: issues,
        riskScore: stats.total === 0 ? 0 : issues / stats.total,
        segments: toSegments(stats.total, stats.segments),
      };
    });

    return sortByRisk ? [...raw].sort((a, b) => b.riskScore - a.riskScore) : raw;
  }, [byStandard, sortByRisk]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Standards</span>
          <Info className="h-3 w-3 shrink-0 cursor-default text-ink-muted hover:text-ink-secondary" aria-hidden="true">
            <title>
              Bar shows each standard's compliance mix. "issues" counts its non-compliant or partial documents;
              "Sort risk" reorders by the share of those.
            </title>
          </Info>
        </div>
        <button
          type="button"
          onClick={() => setSortByRisk((v) => !v)}
          className={`text-[11px] font-medium transition-colors focus:outline-none ${
            sortByRisk ? 'text-noncompliant' : 'text-ink-muted hover:text-ink-secondary'
          }`}
        >
          {sortByRisk ? '↑ By risk' : 'Sort risk'}
        </button>
      </div>

      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        {LEGEND.map((item) => (
          <span key={item.result} className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${complianceIconColor(item.result)}`} aria-hidden="true" />
            <span className="text-[10px] text-ink-muted">{item.label}</span>
          </span>
        ))}
      </div>

      <div className="divide-y divide-border">
        {cards.map((card) => {
          const isSelected = selectedIso === card.filterValue;
          return (
            <button
              key={card.filterValue}
              type="button"
              onClick={() => onSelectIso(isSelected ? 'All ISO' : card.filterValue)}
              aria-pressed={isSelected}
              title={`${card.standard} — ${card.shortName}`}
              className={`flex w-full items-center gap-2.5 px-1.5 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isSelected ? 'bg-accent-tint' : 'hover:bg-subtle'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-[14px] font-bold ${isSelected ? 'text-accent-hover' : 'text-ink'}`}>
                    {card.code}
                  </span>
                  <span className="truncate text-[11px] font-medium text-ink-muted">{card.standard}</span>
                </div>
                <div className="truncate text-[11px] text-ink-muted">{card.shortName}</div>
                <div className="mt-1.5 flex h-[5px] overflow-hidden rounded-full bg-subtle">
                  {card.segments.length > 0 ? (
                    card.segments.map((segment) => (
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
              </div>

              <div className="flex shrink-0 flex-col items-end">
                <span className={`text-[15px] font-bold leading-none ${isSelected ? 'text-accent-hover' : 'text-ink'}`}>
                  {card.total}
                </span>
                {card.issueCount > 0 && (
                  <span className="mt-1 text-[10.5px] font-semibold text-noncompliant">
                    {card.issueCount} {card.issueCount === 1 ? 'issue' : 'issues'}
                  </span>
                )}
              </div>

              <ChevronRight
                className={`h-4 w-4 shrink-0 ${isSelected ? 'text-accent-hover' : 'text-ink-muted'}`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
