import { useMemo, useState } from 'react';
import { ArrowLeftRight, ChevronDown, ExternalLink, TriangleAlert } from 'lucide-react';
import { ComplianceResultBadge, EvidenceStatusBadge } from '../ui/StatusBadge';
import { EVIDENCE_STATUS_STYLES } from '../../utils/statusColors';
import type { EvidenceStatus } from '../../types/evidence';
import type { CoverageEvidenceRef } from '../../types/clauseCoverage';
import {
  COL_CHEVRON,
  COL_CLAUSE,
  COL_COVERAGE,
  COL_EVIDENCE,
  COVERAGE_STATE_LABEL,
  STATE_STYLE,
  makeBreadthLookup,
  rowBreadthRank,
  type BreadthInfo,
  type BreadthLeaf,
  type CoverageRowItem,
} from './clauseCoverageShared';

/** No-op breadth lookup — for row lists that carry no group hierarchy context. */
const NO_BREADTH = (): BreadthInfo | null => null;

interface SortControl {
  active: boolean;
  onToggle: () => void;
}

export function ColumnHeader({ label, sort }: { label: string; sort?: SortControl }) {
  return (
    <div className="flex items-center border-b border-border bg-subtle/60 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
      <div className={COL_CHEVRON} />
      <div className={COL_CLAUSE}>{label}</div>
      <div className={COL_COVERAGE}>Coverage</div>
      <div className={`${COL_EVIDENCE} flex items-center justify-between gap-2`}>
        <span>Mapped evidence</span>
        {sort && (
          <button
            type="button"
            onClick={sort.onToggle}
            aria-pressed={sort.active}
            title="Sort this group by breadth of coverage — widest inherited mappings first. Only affects this group."
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              sort.active
                ? 'bg-accent-tint text-accent-hover'
                : 'text-ink-muted hover:text-ink-secondary'
            }`}
          >
            Breadth
            <span aria-hidden="true" className={sort.active ? '' : 'opacity-40'}>
              ↓
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A group's inner requirement table: the shared column header (with an optional
 * breadth-sort toggle) and its rows. Sort state is local to this list, so it is
 * scoped to a single expanded group and persists per-group while the page lives.
 */
export function CoverageRowList({
  label,
  items,
  leaves,
  unit,
}: {
  label: string;
  items: CoverageRowItem[];
  /** The group's full, pre-filter requirement list — the breadth denominator. */
  leaves: BreadthLeaf[];
  unit: 'controls' | 'clauses';
}) {
  const [byBreadth, setByBreadth] = useState(false);
  const breadthOf = useMemo(() => makeBreadthLookup(leaves, unit), [leaves, unit]);

  const rows = useMemo(() => {
    if (!byBreadth) return items;
    // Array.prototype.sort is stable, so equal-breadth rows keep code order.
    return [...items].sort(
      (a, b) => rowBreadthRank(b.evidence, breadthOf) - rowBreadthRank(a.evidence, breadthOf),
    );
  }, [items, byBreadth, breadthOf]);

  return (
    <div>
      <ColumnHeader
        label={label}
        sort={{ active: byBreadth, onToggle: () => setByBreadth((value) => !value) }}
      />
      {rows.map((item) => (
        <CoverageRow key={item.code} item={item} breadthOf={breadthOf} />
      ))}
    </div>
  );
}

export function CoverageRow({
  item,
  breadthOf = NO_BREADTH,
}: {
  item: CoverageRowItem;
  breadthOf?: (ref: CoverageEvidenceRef) => BreadthInfo | null;
}) {
  const [open, setOpen] = useState(false);
  const style = STATE_STYLE[item.state];
  const expandable = item.evidence.length > 1;
  const label = COVERAGE_STATE_LABEL[item.state];
  const needsWork = item.state === 'Covered (needs work)';

  return (
    <div className={`border-b border-border last:border-b-0 ${style.row}`}>
      <div className="flex items-start py-2.5">
        <div className={`${COL_CHEVRON} flex items-center justify-center pt-0.5`}>
          {expandable && (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label={open ? 'Collapse mapped evidence' : 'Expand mapped evidence'}
              className="flex h-5 w-5 items-center justify-center rounded text-ink-muted transition-colors hover:bg-border hover:text-ink-secondary focus:outline-none"
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-150 ${open ? '' : '-rotate-90'}`}
                aria-hidden="true"
              />
            </button>
          )}
        </div>

        <div className={`${COL_CLAUSE} flex flex-wrap items-baseline gap-x-2 gap-y-1`}>
          <span className="shrink-0 font-mono text-[12px] font-medium text-clause-code">{item.code}</span>
          <span className={`text-[12.5px] ${item.state === 'Not Applicable' ? 'text-ink-secondary' : 'text-ink'}`}>
            {item.title}
          </span>
          {item.ambiguous && (
            <span
              className="inline-flex shrink-0 items-center gap-1 self-center rounded-[4px] border border-accent/40 bg-accent-tint px-1.5 py-0.5 text-[10px] font-semibold text-accent-hover"
              title="Dual meaning: the evidence code is both a management clause and an Annex A control number. The same document is listed on both pages — confirm which was intended."
            >
              <ArrowLeftRight className="h-2.5 w-2.5" aria-hidden="true" />
              Dual meaning
            </span>
          )}
        </div>

        <div className={`${COL_COVERAGE} flex items-center gap-[7px] pt-0.5`}>
          {needsWork ? (
            <TriangleAlert className="h-3 w-3 shrink-0 text-needs-work" aria-hidden="true" />
          ) : (
            <span className={`h-2 w-2 shrink-0 rounded-[2px] ${style.mark}`} aria-hidden="true" />
          )}
          <span className={`text-[12.5px] font-medium ${style.text}`}>{label}</span>
        </div>

        <div className={COL_EVIDENCE}>
          {item.state === 'Not Applicable' ? (
            <span className="text-[12px] italic text-neutral">{item.notApplicableText}</span>
          ) : item.evidence.length === 0 ? (
            <span className="text-[12px] italic text-neutral">No evidence mapped</span>
          ) : !expandable ? (
            <EvidenceLine ev={item.evidence[0]} rowCode={item.code} breadthOf={breadthOf} />
          ) : (
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-muted">
              <span className="rounded-full bg-subtle px-2 py-0.5 font-mono text-[10.5px] font-medium text-ink-secondary">
                {item.evidence.length}
              </span>
              documents mapped
              <span className="text-border-strong" aria-hidden="true">·</span>
              <EvidenceMix evidence={item.evidence} />
            </span>
          )}
        </div>
      </div>

      {expandable && open && (
        <div className="pb-3 pl-7 pr-3">
          <EvidenceTable evidence={item.evidence} rowCode={item.code} breadthOf={breadthOf} />
        </div>
      )}
    </div>
  );
}

// Neutral, outline-only structural flag: the evidence was mapped at the widest
// possible level (a whole theme / a top-level clause), so every requirement
// beneath it inherits it. Definitional — not a count threshold, no alarm colour.
export function BroadMappingBadge() {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-[4px] border border-neutral/40 px-1.5 py-0.5 text-[10px] font-medium text-neutral"
      title="The evidence is mapped at the widest level — a whole theme or a top-level clause — so every requirement beneath it inherits it."
    >
      Broad mapping
    </span>
  );
}

// Inherited-mapping badge: which ancestor the evidence came from, and how wide
// that ancestor is as a ratio of the siblings it stands in for. The numbers are
// the only emphasised part — typography only, no colour, no icon, no threshold.
export function BreadthBadge({ info, rowCode }: { info: BreadthInfo; rowCode: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-[4px] bg-subtle px-1.5 py-0.5 text-[10px] text-ink-muted"
      title={`Mapped to ${info.via}, inherited by ${rowCode}. This one mapping stands in for ${info.covered} of ${info.total} ${info.unit} under ${info.via}.`}
    >
      <span className="font-mono">via {info.via}</span>
      <span className="text-border-strong" aria-hidden="true">·</span>
      <span className="font-mono font-semibold text-ink-secondary">
        {info.covered}/{info.total}
      </span>
      <span>{info.unit}</span>
    </span>
  );
}

// Compact one-liner shown in the Mapped evidence column when a row has a single
// mapped document (no chevron / table).
function EvidenceLine({
  ev,
  rowCode,
  breadthOf,
}: {
  ev: CoverageEvidenceRef;
  rowCode: string;
  breadthOf: (ref: CoverageEvidenceRef) => BreadthInfo | null;
}) {
  const breadth = breadthOf(ev);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-[4px] bg-subtle px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-ink-secondary">
        {ev.evidenceId}
      </span>
      <span className="text-[12px] text-ink-muted">{ev.name}</span>
      {breadth ? (
        <BreadthBadge info={breadth} rowCode={rowCode} />
      ) : (
        ev.mappedVia === 'parent' && (
          <span
            className="rounded-[4px] bg-subtle px-1.5 py-0.5 font-mono text-[10px] text-ink-muted"
            title={`Mapped to ${ev.mappedClause}, inherited by ${rowCode}`}
          >
            via {ev.mappedClause}
          </span>
        )
      )}
      {breadth?.broad && <BroadMappingBadge />}
      {ev.ambiguous && ev.counterpart && (
        <span
          className="inline-flex items-center gap-1 rounded-[4px] border border-accent/40 bg-accent-tint px-1.5 py-0.5 text-[10px] font-medium text-accent-hover"
          title={`Token "${ev.mappedClause}" could also mean ${ev.counterpart.code}${
            ev.counterpart.title ? ` ${ev.counterpart.title}` : ''
          }. This document is also listed there — confirm which was intended.`}
        >
          <ArrowLeftRight className="h-2.5 w-2.5" aria-hidden="true" />
          also <span className="font-mono">{ev.counterpart.code}</span>
        </span>
      )}
    </div>
  );
}

// Accepted / pending / rejected split for a clause with several mapped
// documents, so the mix is visible without expanding the row. Same dot palette
// as EvidenceStatusBadge; buckets are shown in review order, empty ones omitted.
const EVIDENCE_MIX_ORDER: EvidenceStatus[] = [
  'Accepted',
  'Pending Review',
  'Rejected',
  'Missing',
];

const EVIDENCE_MIX_LABEL: Record<EvidenceStatus, string> = {
  Accepted: 'accepted',
  'Pending Review': 'pending',
  Rejected: 'rejected',
  Missing: 'missing',
};

function EvidenceMix({ evidence }: { evidence: CoverageEvidenceRef[] }) {
  const buckets = EVIDENCE_MIX_ORDER.map((status) => ({
    status,
    count: evidence.filter((ev) => ev.evidenceStatus === status).length,
  })).filter((bucket) => bucket.count > 0);

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      {buckets.map((bucket, index) => (
        <span key={bucket.status} className="inline-flex items-center gap-x-2">
          {index > 0 && (
            <span className="text-border-strong" aria-hidden="true">·</span>
          )}
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${EVIDENCE_STATUS_STYLES[bucket.status].dot}`}
              aria-hidden="true"
            />
            <span>
              <span className={`font-medium ${EVIDENCE_STATUS_STYLES[bucket.status].text}`}>
                {bucket.count}
              </span>{' '}
              {EVIDENCE_MIX_LABEL[bucket.status]}
            </span>
          </span>
        </span>
      ))}
    </span>
  );
}

// ─── Expanded mapped-evidence table ────────────────────────────────────────
// Shown under a row when the chevron is open. Same table visual language as the
// Evidence documents table: subtle uppercase header, hairline row rules, badges.

const EV_TH =
  'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-secondary whitespace-nowrap';
const EV_TD = 'px-3 py-2 align-top';

function EvidenceTable({
  evidence,
  rowCode,
  breadthOf,
}: {
  evidence: CoverageEvidenceRef[];
  rowCode: string;
  breadthOf: (ref: CoverageEvidenceRef) => BreadthInfo | null;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
      <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
        <thead className="border-b border-border bg-subtle/60">
          <tr>
            <th scope="col" className={EV_TH}>ID</th>
            <th scope="col" className={EV_TH}>Document</th>
            <th scope="col" className={EV_TH}>Mapping</th>
            <th scope="col" className={EV_TH}>Evidence</th>
            <th scope="col" className={EV_TH}>Compliance</th>
            <th scope="col" className={`${EV_TH} text-right`}>Link</th>
          </tr>
        </thead>
        <tbody>
          {evidence.map((ev) => (
            <EvidenceTableRow
              key={ev.evidenceId}
              ev={ev}
              rowCode={rowCode}
              breadth={breadthOf(ev)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EvidenceTableRow({
  ev,
  rowCode,
  breadth,
}: {
  ev: CoverageEvidenceRef;
  rowCode: string;
  breadth: BreadthInfo | null;
}) {
  return (
    <tr className="border-b border-border last:border-b-0 transition-colors hover:bg-subtle/50">
      <td className={`${EV_TD} whitespace-nowrap`}>
        <span className="rounded-[4px] bg-subtle px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-ink-secondary">
          {ev.evidenceId}
        </span>
      </td>
      <td className={EV_TD}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] text-ink">{ev.name}</span>
          {ev.ambiguous && ev.counterpart && (
            <span
              className="inline-flex items-center gap-1 rounded-[4px] border border-accent/40 bg-accent-tint px-1.5 py-0.5 text-[10px] font-medium text-accent-hover"
              title={`Token "${ev.mappedClause}" could also mean ${ev.counterpart.code}${
                ev.counterpart.title ? ` ${ev.counterpart.title}` : ''
              }. This document is also listed there — confirm which was intended.`}
            >
              <ArrowLeftRight className="h-2.5 w-2.5" aria-hidden="true" />
              also <span className="font-mono">{ev.counterpart.code}</span>
            </span>
          )}
        </div>
      </td>
      <td className={`${EV_TD} whitespace-nowrap`}>
        {breadth ? (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 text-[12px] text-ink-muted"
              title={`Mapped to ${breadth.via}, inherited by ${rowCode}. This one mapping stands in for ${breadth.covered} of ${breadth.total} ${breadth.unit} under ${breadth.via}.`}
            >
              via <span className="font-mono text-[11px] text-ink-secondary">{breadth.via}</span>
              <span className="text-border-strong" aria-hidden="true">·</span>
              <span className="font-mono text-[11px] font-semibold text-ink-secondary">
                {breadth.covered}/{breadth.total}
              </span>
              <span className="text-[11px]">{breadth.unit}</span>
            </span>
            {breadth.broad && <BroadMappingBadge />}
          </span>
        ) : ev.mappedVia === 'parent' ? (
          <span
            className="inline-flex items-center gap-1 text-[12px] text-ink-muted"
            title={`Mapped to ${ev.mappedClause}, inherited by ${rowCode}`}
          >
            via <span className="font-mono text-[11px] text-ink-secondary">{ev.mappedClause}</span>
          </span>
        ) : (
          <span className="text-[12px] text-ink-muted">Direct</span>
        )}
      </td>
      <td className={EV_TD}>
        <EvidenceStatusBadge status={ev.evidenceStatus} />
      </td>
      <td className={EV_TD}>
        <ComplianceResultBadge result={ev.complianceResult} />
      </td>
      <td className={`${EV_TD} whitespace-nowrap text-right`}>
        {ev.documentUrl ? (
          <a
            href={ev.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-link hover:text-accent-hover hover:underline focus:outline-none"
          >
            Open
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ) : (
          <span className="text-[12px] text-ink-muted">—</span>
        )}
      </td>
    </tr>
  );
}
