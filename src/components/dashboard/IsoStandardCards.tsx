import { useMemo } from 'react';
import { complianceIconColor } from '../../utils/statusColors';
import { ISO_STANDARDS } from '../../data/isoStandards';
import { isOverdue } from '../../utils/evidenceFormatting';
import { ALL_ISO, type ComplianceResult, type EvidenceDocument, type IsoFilterValue } from '../../types/evidence';

interface IsoStandardCardsProps {
  documentsForCards: EvidenceDocument[];
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
  label: string;
  isAll: boolean;
  total: number;
  overdueCount: number;
  segments: { result: ComplianceResult; widthPercent: number }[];
}

export function IsoStandardCards({ documentsForCards, selectedIso, onSelectIso }: IsoStandardCardsProps) {
  const cards = useMemo<CardData[]>(() => {
    const definitions = [
      { filterValue: ALL_ISO as IsoFilterValue, code: 'All ISO', label: 'All standards', isAll: true },
      ...ISO_STANDARDS.map((std) => ({
        filterValue: std.code as IsoFilterValue,
        code: std.code,
        label: std.shortName,
        isAll: false,
      })),
    ];

    return definitions.map((def) => {
      const docsHere = def.isAll
        ? documentsForCards
        : documentsForCards.filter((doc) => doc.iso === def.filterValue);
      const total = docsHere.length;
      const overdueCount = docsHere.filter((doc) => isOverdue(doc.dueDate)).length;
      const segMax = Math.max(1, total);
      const segments = COMPLIANCE_ORDER.map((result) => ({
        result,
        widthPercent: (docsHere.filter((doc) => doc.complianceResult === result).length / segMax) * 100,
      })).filter((seg) => seg.widthPercent > 0);

      return { ...def, total, overdueCount, segments };
    });
  }, [documentsForCards]);

  return (
    <div className="mb-6">
      <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        ISO standard
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const isSelected = selectedIso === card.filterValue;
          return (
            <button
              key={card.filterValue}
              type="button"
              onClick={() => onSelectIso(card.filterValue)}
              aria-pressed={isSelected}
              className={`rounded-[10px] border p-4 text-left shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
                card.isAll ? 'lg:col-span-2' : ''
              } ${
                isSelected
                  ? 'border-[1.5px] border-accent bg-accent-tint'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className={`mb-0.5 text-[15px] font-bold ${isSelected ? 'text-accent' : 'text-slate-900'}`}>
                {card.code}
              </div>
              <div className="mb-2.5 text-[11px] text-slate-500">{card.label}</div>
              <div className="mb-2 text-[22px] font-bold text-slate-900">
                {card.total}
                <span className="ml-1 text-[11px] font-medium text-slate-500">docs</span>
              </div>
              <div className="mb-1.5 flex h-[5px] overflow-hidden rounded-full bg-slate-100">
                {card.segments.map((segment) => (
                  <div
                    key={segment.result}
                    style={{ width: `${segment.widthPercent}%` }}
                    className={`h-full ${complianceIconColor(segment.result)}`}
                  />
                ))}
              </div>
              {card.overdueCount > 0 && (
                <div className="text-[10.5px] font-semibold text-amber-600">{card.overdueCount} overdue</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
