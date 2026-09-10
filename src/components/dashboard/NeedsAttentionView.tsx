import { useMemo, useState } from 'react';
import { AlertTriangle, Clock, ExternalLink, RotateCcw, Search, XCircle } from 'lucide-react';
import { formatDueDate } from '../../utils/evidenceFormatting';
import { selectClass } from './clauseCoverageShared';
import { ISO_STANDARDS, getStandardName } from '../../data/isoStandards';
import { ALL_ISO, type IsoFilterValue } from '../../types/evidence';
import {
  ALL_REASONS,
  REASON_LABEL,
  type NeedsAttentionItem,
  type NeedsAttentionReason,
  type NeedsAttentionResponse,
  type ReasonFilterValue,
} from '../../types/needsAttention';

interface NeedsAttentionViewProps {
  data: NeedsAttentionResponse | null;
  error: string | null;
  /** Shared sidebar standard picker — the single source of truth for the standard scope. */
  iso: IsoFilterValue;
  onIsoChange: (value: IsoFilterValue) => void;
}

// Fixed queue order — overdue is the most time-critical, then rejected, then
// clauses that are technically covered but resting on rejected evidence.
const REASON_ORDER: NeedsAttentionReason[] = ['overdue', 'rejected', 'needsWork'];

// Reuse the existing state palette: overdue = the amber-red overdue tone,
// rejected = the rose evidence-rejected tone, needsWork = the teal
// --color-needs-work token from the clause-coverage work.
const REASON_STYLE: Record<
  NeedsAttentionReason,
  { dot: string; text: string; row: string; Icon: typeof Clock }
> = {
  overdue: { dot: 'bg-overdue-accent', text: 'text-overdue-fg', row: 'bg-overdue-row', Icon: Clock },
  rejected: { dot: 'bg-ev-rejected', text: 'text-ev-rejected', row: 'bg-noncompliant-bg/40', Icon: XCircle },
  needsWork: { dot: 'bg-needs-work', text: 'text-needs-work', row: 'bg-needs-work-bg/40', Icon: AlertTriangle },
};

const CARDS: {
  reason: NeedsAttentionReason;
  title: string;
  description: string;
}[] = [
  {
    reason: 'overdue',
    title: 'Overdue evidence',
    description: 'Evidence documents now past their due date.',
  },
  {
    reason: 'rejected',
    title: 'Rejected evidence',
    description: 'Evidence the auditor reviewed and sent back.',
  },
  {
    reason: 'needsWork',
    title: 'Covered — needs work',
    description: 'In-scope clauses whose only mapped evidence is rejected.',
  },
];

function itemStandards(item: NeedsAttentionItem): string[] {
  return item.standards;
}

function itemName(item: NeedsAttentionItem): string {
  return item.reason === 'needsWork' ? item.clauseTitle : item.name;
}

function itemRef(item: NeedsAttentionItem): string {
  return item.reason === 'needsWork' ? item.clauseCode : item.evidenceId;
}

// "Why it needs attention" — derived exactly from existing fields, nothing invented.
function whyText(item: NeedsAttentionItem): string {
  switch (item.reason) {
    case 'overdue':
      return `Due ${formatDueDate(item.dueDate)} · ${item.daysOverdue} ${
        item.daysOverdue === 1 ? 'day' : 'days'
      } overdue`;
    case 'rejected':
      // No rejection date or free-text reason exists in the data source — the
      // Compliance Result is the only detail, and we fall back to plain
      // "Rejected" when even that is absent.
      return item.complianceResult ? `Rejected · ${item.complianceResult}` : 'Rejected';
    case 'needsWork':
      return `Only mapped evidence (${item.rejectedEvidenceIds.join(', ')}) is rejected.`;
  }
}

function matchesSearch(item: NeedsAttentionItem, query: string): boolean {
  if (!query) return true;
  const haystack = [
    itemRef(item),
    itemName(item),
    ...item.standards,
    ...item.clauseCodes,
    ...(item.reason === 'needsWork' ? item.rejectedEvidenceIds : []),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

export function NeedsAttentionView({ data, error, iso, onIsoChange }: NeedsAttentionViewProps) {
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState<ReasonFilterValue>(ALL_REASONS);

  // Item standards come through as management-system names ("ISMS", "PIMS", …);
  // the sidebar picker speaks ISO codes ("ISO 27001"). Map once for the filter.
  const selectedStandardName = iso === ALL_ISO ? null : getStandardName(iso);

  // Only offer standards that actually have an open item in the queue.
  const standardOptions = useMemo(() => {
    if (!data) return [];
    const present = new Set<string>();
    data.items.forEach((item) => item.standards.forEach((s) => present.add(s)));
    return ISO_STANDARDS.filter((std) => present.has(std.standard));
  }, [data]);

  const query = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.items.filter(
      (item) =>
        (reason === ALL_REASONS || item.reason === reason) &&
        (selectedStandardName === null || item.standards.includes(selectedStandardName)) &&
        matchesSearch(item, query),
    );
  }, [data, reason, selectedStandardName, query]);

  // Backend already sorts within and across categories; grouping keeps that order.
  const groups = useMemo(
    () =>
      REASON_ORDER.map((r) => ({
        reason: r,
        items: filtered.filter((item) => item.reason === r),
      })).filter((group) => group.items.length > 0),
    [filtered],
  );

  const hasFilters =
    reason !== ALL_REASONS || iso !== ALL_ISO || query.length > 0;

  function resetFilters() {
    setSearch('');
    setReason(ALL_REASONS);
    onIsoChange(ALL_ISO);
  }

  const viewCounts = {
    overdue: filtered.filter((i) => i.reason === 'overdue').length,
    rejected: filtered.filter((i) => i.reason === 'rejected').length,
    needsWork: filtered.filter((i) => i.reason === 'needsWork').length,
  };

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-[16px] font-semibold text-ink">Needs Attention</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-secondary">
          Everything waiting on an auditor — overdue evidence, rejected evidence and clauses covered
          but needing work
          {data ? ` · ${data.totals.total} open item${data.totals.total === 1 ? '' : 's'}` : ''}
        </p>
      </div>

      {/* ── Summary cards ── */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {CARDS.map((card) => {
          const style = REASON_STYLE[card.reason];
          return (
            <div
              key={card.reason}
              className="rounded-[10px] border border-border bg-surface p-3.5 shadow-sm"
            >
              <div className={`mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold ${style.text}`}>
                <style.Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {card.title}
              </div>
              <div className="text-[26px] font-bold leading-none text-ink">
                {data ? data.totals[card.reason] : '—'}
              </div>
              <p className="mt-1.5 text-[11.5px] leading-4 text-ink-muted">{card.description}</p>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-[10px] border border-border bg-surface shadow-sm">
        {/* ── Filter bar ── */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3.5">
          <label className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2 h-3 w-3 text-ink-muted" aria-hidden="true" />
            <span className="sr-only">Search attention items</span>
            <input
              type="search"
              placeholder="Search by item, standard or clause…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={`h-7 w-64 rounded-md border pl-7 pr-2.5 text-[12.5px] transition-colors focus:outline-none focus:ring-1 focus:ring-accent ${
                search
                  ? 'border-accent bg-accent-tint text-accent-hover placeholder:text-accent-hover/60'
                  : 'border-border bg-surface text-ink-secondary placeholder:text-ink-muted hover:border-border-strong'
              }`}
            />
          </label>

          <label className="flex items-center gap-1.5 text-[11.5px] text-ink-muted">
            <span>Reason</span>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as ReasonFilterValue)}
              className={selectClass(reason !== ALL_REASONS)}
            >
              <option value={ALL_REASONS}>All</option>
              <option value="overdue">Overdue</option>
              <option value="rejected">Rejected</option>
              <option value="needsWork">Covered (needs work)</option>
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-[11.5px] text-ink-muted">
            <span>Standard</span>
            <select
              value={iso}
              onChange={(event) => onIsoChange(event.target.value as IsoFilterValue)}
              className={selectClass(iso !== ALL_ISO)}
            >
              <option value={ALL_ISO}>All</option>
              {standardOptions.map((std) => (
                <option key={std.code} value={std.code}>
                  {std.code} · {std.shortName}
                </option>
              ))}
            </select>
          </label>

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex h-7 items-center gap-1 rounded-md border border-border bg-surface px-2.5 text-[12.5px] font-medium text-ink-secondary shadow-sm transition-colors hover:border-noncompliant/30 hover:bg-noncompliant-bg hover:text-noncompliant focus:outline-none"
            >
              <RotateCcw className="h-2.5 w-2.5" aria-hidden="true" />
              Reset
            </button>
          )}

          <span className="ml-auto text-[12px] tabular-nums text-ink-muted">
            {data ? `${filtered.length} of ${data.totals.total} items` : ''}
          </span>
        </div>

        {/* ── Card title ── */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <span className="text-[14px] font-semibold text-ink">Attention items</span>
          {data && (
            <span className="text-[12px] text-ink-muted">
              Sorted by urgency
              <span className="mx-1.5 text-border-strong">·</span>
              {data.totals.overdue} overdue
              <span className="mx-1.5 text-border-strong">·</span>
              {data.totals.rejected} rejected
              <span className="mx-1.5 text-border-strong">·</span>
              {data.totals.needsWork} covered (needs work)
            </span>
          )}
        </div>

        {/* ── Content ── */}
        {error ? (
          <div className="px-4 py-10 text-center text-[13px] text-noncompliant">{error}</div>
        ) : !data ? (
          <div className="px-4 py-10 text-center text-[13px] text-ink-secondary">
            Loading the attention queue…
          </div>
        ) : groups.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mb-1.5 text-[14px] font-semibold text-ink">
              {data.totals.total === 0 ? 'Nothing needs attention' : 'No items match your filters'}
            </div>
            <p className="mb-4 text-[13px] text-ink-secondary">
              {data.totals.total === 0
                ? 'No overdue or rejected evidence, and no clause resting on rejected-only evidence.'
                : 'Try another reason or standard.'}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-md border border-border-strong bg-surface px-4.5 py-2 text-[13px] font-semibold text-ink-secondary hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-[12.5px]">
              <thead className="border-b border-border-strong bg-subtle">
                <tr>
                  {['Reason', 'Item', 'Standard', 'Clause', 'Why it needs attention', 'Open'].map(
                    (label) => (
                      <th
                        key={label}
                        scope="col"
                        className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-secondary"
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {groups.flatMap((group) =>
                  group.items.map((item) => <AttentionRow key={item.key} item={item} />),
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Footer: count summary ── */}
        {data && groups.length > 0 && (
          <div className="border-t border-border px-4 py-3 text-[12px] text-ink-muted">
            {filtered.length} attention item{filtered.length === 1 ? '' : 's'} · {viewCounts.overdue}{' '}
            overdue · {viewCounts.rejected} rejected · {viewCounts.needsWork} covered (needs work).
            Filter by reason or standard to work one queue at a time.
          </div>
        )}
      </div>

      {/* ── Explanatory note (always visible) ── */}
      <p className="mt-3 text-[12px] italic leading-5 text-ink-muted">
        This page only re-lists items already flagged elsewhere in the dashboard — overdue and
        rejected evidence from Evidence Documents, and “Covered (needs work)” clauses from Clause
        Coverage. It adds no new risk score or status. Clearing an item here means fixing it on its
        own page: re-collect or re-upload the evidence, or get the rejected document accepted.
      </p>
    </div>
  );
}

function AttentionRow({ item }: { item: NeedsAttentionItem }) {
  const style = REASON_STYLE[item.reason];
  const clauseCodes = item.clauseCodes;

  return (
    <tr className={`border-b border-border border-l-2 border-l-transparent ${style.row}`}>
      <td className="whitespace-nowrap px-3 py-2.5 align-top">
        <span className={`inline-flex items-center gap-1.5 font-medium ${style.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
          {REASON_LABEL[item.reason]}
        </span>
      </td>
      <td className="px-3 py-2.5 align-top">
        <div className="flex flex-col">
          <span className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
            {itemRef(item)}
          </span>
          <span className="font-medium text-ink">{itemName(item)}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 align-top">
        <div className="flex flex-wrap gap-1">
          {itemStandards(item).map((std) => (
            <span
              key={std}
              className="inline-block rounded-md bg-standard-bg px-1.5 py-0.5 text-[10.5px] font-semibold text-white"
            >
              {std}
            </span>
          ))}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 align-top font-mono text-[11.5px] text-ink-secondary">
        {clauseCodes.length === 0
          ? '—'
          : clauseCodes.length === 1
            ? clauseCodes[0]
            : `${clauseCodes[0]} +${clauseCodes.length - 1}`}
      </td>
      <td className="px-3 py-2.5 align-top text-[12px] text-ink-secondary">{whyText(item)}</td>
      <td className="whitespace-nowrap px-3 py-2.5 align-top">
        {item.documentUrl ? (
          <a
            href={item.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Opens the source document"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-link hover:text-accent-hover hover:underline focus:outline-none"
          >
            Open evidence
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ) : (
          <span className="text-[13px] text-ink-muted" title="No source document uploaded yet">
            Not available
          </span>
        )}
      </td>
    </tr>
  );
}
