import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { complianceIconColor } from '../../utils/statusColors';
import { ISO_STANDARDS } from '../../data/isoStandards';
import type { StandardCardStats } from '../../services/evidenceApi';
import type { ComplianceResult, IsoFilterValue } from '../../types/evidence';

interface IsoStandardCardsProps {
  byStandard: StandardCardStats[];
  selectedIso: IsoFilterValue;
  onSelectIso: (iso: IsoFilterValue) => void;
  compact?: boolean;
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
  shortName: string;
  total: number;
  overdueCount: number;
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

function riskScore(segments: StandardCardStats['segments'], total: number): number {
  if (total === 0) return 0;
  const risky = segments
    .filter((segment) => segment.result === 'Non-compliant' || segment.result === 'Partially compliant')
    .reduce((sum, segment) => sum + segment.count, 0);
  return risky / total;
}

// Small bold text on light backgrounds — the status tokens are tuned to clear WCAG AA (4.5:1).
function riskTextClass(riskPct: number): string {
  if (riskPct >= 40) return 'text-noncompliant';
  if (riskPct >= 20) return 'text-partial';
  return 'text-ink-muted';
}

export function IsoStandardCards({ byStandard, selectedIso, onSelectIso, compact = false }: IsoStandardCardsProps) {
  const [sortByRisk, setSortByRisk] = useState(false);

  const cards = useMemo<CardData[]>(() => {
    const statsByStandard = new Map(byStandard.map((entry) => [entry.standard, entry]));
    const emptyStats: StandardCardStats = { standard: '', total: 0, overdueCount: 0, segments: [] };

    const raw = ISO_STANDARDS.map((std) => {
      const stats = statsByStandard.get(std.standard) ?? emptyStats;
      return {
        filterValue: std.code as IsoFilterValue,
        code: std.standard,
        standard: std.code,
        shortName: std.shortName,
        total: stats.total,
        overdueCount: stats.overdueCount,
        riskScore: riskScore(stats.segments, stats.total),
        segments: toSegments(stats.total, stats.segments),
      };
    });

    return sortByRisk ? [...raw].sort((a, b) => b.riskScore - a.riskScore) : raw;
  }, [byStandard, sortByRisk]);

  if (compact) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Standards</span>
            <Info className="h-3 w-3 shrink-0 cursor-default text-ink-muted hover:text-ink-secondary" aria-hidden="true">
              <title>
                Bar shows each standard's compliance mix. ⚠ is its count of overdue documents; "Sort risk" reorders by
                share of non-compliant or partial documents and shows that percentage.
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

        <div className="space-y-0.5">
          {cards.map((card) => {
            const isSelected = selectedIso === card.filterValue;
            const riskPct = Math.round(card.riskScore * 100);
            return (
              <button
                key={card.filterValue}
                type="button"
                onClick={() => onSelectIso(isSelected ? 'All ISO' : card.filterValue)}
                aria-pressed={isSelected}
                title={`${card.standard} — ${card.shortName}`}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isSelected ? 'bg-accent-tint' : 'hover:bg-subtle'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-[13px] font-bold ${isSelected ? 'text-accent-hover' : 'text-ink'}`}>
                      {card.code}
                    </span>
                    <span className="truncate text-[11px] text-ink-muted">{card.shortName}</span>
                  </div>
                  <div className="mt-1 flex h-[5px] overflow-hidden rounded-full bg-subtle">
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

                <div className="shrink-0 text-right">
                  <div className={`text-[14px] font-bold ${isSelected ? 'text-accent-hover' : 'text-ink-secondary'}`}>
                    {card.total}
                  </div>
                  {sortByRisk && riskPct > 0 ? (
                    <div className={`text-[10.5px] font-semibold ${riskTextClass(riskPct)}`}>{riskPct}%</div>
                  ) : card.overdueCount > 0 ? (
                    <div className="text-[10.5px] font-semibold text-overdue-fg">{card.overdueCount}⚠</div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          Standards — click to filter
        </span>
        <button
          type="button"
          onClick={() => setSortByRisk((v) => !v)}
          className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            sortByRisk ? 'border-noncompliant/30 bg-noncompliant-bg text-noncompliant' : 'border-border bg-surface text-ink-secondary hover:border-border-strong'
          }`}
        >
          {sortByRisk ? 'Sorted: highest risk first' : 'Sort by risk'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
        {cards.map((card) => {
          const isSelected = selectedIso === card.filterValue;
          const riskPct = Math.round(card.riskScore * 100);
          return (
            <button
              key={card.filterValue}
              type="button"
              onClick={() => onSelectIso(isSelected ? 'All ISO' : card.filterValue)}
              aria-pressed={isSelected}
              title={`${card.standard} — ${card.shortName}`}
              className={`rounded-[10px] border p-3.5 text-left shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
                isSelected ? 'border-[1.5px] border-accent bg-accent-tint' : 'border-border bg-surface hover:border-border-strong'
              }`}
            >
              <div className="mb-0.5 flex items-baseline justify-between gap-1">
                <span className={`text-[14px] font-bold ${isSelected ? 'text-accent-hover' : 'text-ink'}`}>
                  {card.code}
                </span>
                <span className="text-[16px] font-bold text-ink">{card.total}</span>
              </div>
              <div className="mb-0.5 truncate text-[11.5px] font-medium text-ink-secondary">{card.standard}</div>
              <div className="mb-2.5 truncate text-[11px] text-ink-muted">{card.shortName}</div>
              <div className="mb-1 flex h-[5px] overflow-hidden rounded-full bg-subtle">
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
                  <div className="h-full w-full bg-subtle" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="h-[14px] text-[11px] font-semibold text-overdue-fg">
                  {card.overdueCount > 0 ? `${card.overdueCount} overdue` : ''}
                </div>
                {sortByRisk && riskPct > 0 && (
                  <span className={`text-[11px] font-semibold ${riskTextClass(riskPct)}`}>{riskPct}% risk</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
