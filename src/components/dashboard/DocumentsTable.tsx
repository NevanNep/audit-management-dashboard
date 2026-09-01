import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { EmptyState } from './EmptyState';
import { ClauseTag } from '../ui/ClauseTag';
import { ComplianceResultBadge, EvidenceStatusBadge } from '../ui/StatusBadge';
import { formatDueDate, isOverdue } from '../../utils/evidenceFormatting';
import { getStandardName, ISO_STANDARDS } from '../../data/isoStandards';
import { CLAUSE_LABELS } from '../../data/clauses';
import { EVIDENCE_STATUS_OPTIONS, COMPLIANCE_RESULT_OPTIONS } from '../../data/filterOptions';
import {
  ALL_CLAUSES,
  ALL_COMPLIANCE_RESULTS,
  ALL_EVIDENCE_STATUSES,
  ALL_ISO,
  ALL_LOCATIONS,
} from '../../types/evidence';
import type {
  ClauseCode,
  ClauseFilterValue,
  ComplianceResultFilterValue,
  EvidenceDocument,
  EvidenceStatusFilterValue,
  IsoCode,
  IsoFilterValue,
  LocationFilterValue,
  SortKey,
  SortState,
} from '../../types/evidence';

// ─── Filter toolbar ─────────────────────────────────────────────────────────

interface FilterToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  iso: IsoFilterValue;
  onIsoChange: (value: IsoFilterValue) => void;
  clause: ClauseFilterValue;
  onClauseChange: (value: ClauseFilterValue) => void;
  clauseOptions: ClauseFilterValue[];
  location: LocationFilterValue;
  onLocationChange: (value: LocationFilterValue) => void;
  locationOptions: LocationFilterValue[];
  evidenceStatus: EvidenceStatusFilterValue;
  onEvidenceStatusChange: (value: EvidenceStatusFilterValue) => void;
  complianceResult: ComplianceResultFilterValue;
  onComplianceResultChange: (value: ComplianceResultFilterValue) => void;
  overdueOnly: boolean;
  onOverdueOnlyChange: (value: boolean) => void;
  onReset: () => void;
  hasActive: boolean;
}

// The search input keeps its own local state so typing feels instant; the
// value is only pushed up to onSearchChange (which drives a network fetch
// and a full table re-render) after the user pauses, so keystrokes never
// wait on a round trip.
const SEARCH_DEBOUNCE_MS = 300;

function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (inputValue === value) return;
    const timeout = setTimeout(() => onChange(inputValue), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
      <label htmlFor="documents-search" className="sr-only">
        Search documents
      </label>
      <input
        id="documents-search"
        type="search"
        placeholder="Search documents…"
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        className={`h-7 w-44 rounded-md border pl-7 pr-2.5 text-[12.5px] transition-colors focus:outline-none focus:ring-1 focus:ring-accent ${
          inputValue
            ? 'border-accent bg-accent-tint text-accent-hover placeholder:text-accent-hover/60'
            : 'border-border bg-surface text-ink-secondary placeholder:text-ink-muted hover:border-border-strong'
        }`}
      />
    </div>
  );
}

const selectClass = (active: boolean) =>
  `h-7 rounded-md border px-2 text-[12.5px] transition-colors focus:outline-none focus:ring-1 focus:ring-accent ${
    active ? 'border-accent bg-accent-tint font-medium text-accent-hover' : 'border-border bg-surface text-ink-secondary hover:border-border-strong'
  }`;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-[11.5px] text-ink-muted">
      <span className="whitespace-nowrap">{label}</span>
      {children}
    </label>
  );
}

function FilterToolbar({
  search,
  onSearchChange,
  iso,
  onIsoChange,
  clause,
  onClauseChange,
  clauseOptions,
  location,
  onLocationChange,
  locationOptions,
  evidenceStatus,
  onEvidenceStatusChange,
  complianceResult,
  onComplianceResultChange,
  overdueOnly,
  onOverdueOnlyChange,
  onReset,
  hasActive,
}: FilterToolbarProps) {
  return (
    <div className="px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <SearchInput value={search} onChange={onSearchChange} />

        <Field label="Standard">
          <select
            value={iso}
            onChange={(event) => onIsoChange(event.target.value as IsoFilterValue)}
            className={selectClass(iso !== ALL_ISO)}
          >
            <option value={ALL_ISO}>All</option>
            {ISO_STANDARDS.map((std) => (
              <option key={std.code} value={std.code}>
                {std.standard} · {std.code}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Clause">
          <select
            value={clause}
            onChange={(event) => onClauseChange(event.target.value as ClauseFilterValue)}
            className={selectClass(clause !== ALL_CLAUSES)}
          >
            <option value={ALL_CLAUSES}>All</option>
            {clauseOptions
              .filter((option) => option !== ALL_CLAUSES)
              .map((option) => (
                <option key={option} value={option}>
                  {CLAUSE_LABELS[option] ? `${option} — ${CLAUSE_LABELS[option]}` : option}
                </option>
              ))}
          </select>
        </Field>

        <Field label="Location">
          <select
            value={location}
            onChange={(event) => onLocationChange(event.target.value as LocationFilterValue)}
            className={selectClass(location !== ALL_LOCATIONS)}
          >
            {locationOptions.map((option) => (
              <option key={option} value={option}>
                {option === ALL_LOCATIONS ? 'All' : option}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Evidence">
          <select
            value={evidenceStatus}
            onChange={(event) => onEvidenceStatusChange(event.target.value as EvidenceStatusFilterValue)}
            className={selectClass(evidenceStatus !== ALL_EVIDENCE_STATUSES)}
          >
            {EVIDENCE_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === ALL_EVIDENCE_STATUSES ? 'All' : option}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Compliance">
          <select
            value={complianceResult}
            onChange={(event) => onComplianceResultChange(event.target.value as ComplianceResultFilterValue)}
            className={selectClass(complianceResult !== ALL_COMPLIANCE_RESULTS)}
          >
            {COMPLIANCE_RESULT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === ALL_COMPLIANCE_RESULTS ? 'All' : option}
              </option>
            ))}
          </select>
        </Field>

        <label
          className={`flex h-7 cursor-pointer select-none items-center gap-1.5 rounded-md border px-2 text-[12.5px] transition-colors ${
            overdueOnly ? 'border-accent bg-accent-tint font-medium text-accent-hover' : 'border-border bg-surface text-ink-secondary hover:border-border-strong'
          }`}
        >
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(event) => onOverdueOnlyChange(event.target.checked)}
            className="h-3 w-3 rounded accent-accent"
          />
          Overdue only
        </label>

        {hasActive && (
          <button
            type="button"
            onClick={onReset}
            className="flex h-7 items-center gap-1 rounded-md border border-border bg-surface px-2.5 text-[12.5px] font-medium text-ink-secondary shadow-sm transition-colors hover:border-noncompliant/30 hover:bg-noncompliant-bg hover:text-noncompliant focus:outline-none"
          >
            <RotateCcw className="h-2.5 w-2.5" aria-hidden="true" />
            Reset
          </button>
        )}
      </div>

      {hasActive && (
        <ActiveChips
          search={search}
          onClearSearch={() => onSearchChange('')}
          iso={iso}
          onClearIso={() => onIsoChange(ALL_ISO)}
          clause={clause}
          onClearClause={() => onClauseChange(ALL_CLAUSES)}
          location={location}
          onClearLocation={() => onLocationChange(ALL_LOCATIONS)}
          evidenceStatus={evidenceStatus}
          onClearEvidenceStatus={() => onEvidenceStatusChange(ALL_EVIDENCE_STATUSES)}
          complianceResult={complianceResult}
          onClearComplianceResult={() => onComplianceResultChange(ALL_COMPLIANCE_RESULTS)}
          overdueOnly={overdueOnly}
          onClearOverdue={() => onOverdueOnlyChange(false)}
        />
      )}
    </div>
  );
}

interface ActiveChipsProps {
  search: string;
  onClearSearch: () => void;
  iso: IsoFilterValue;
  onClearIso: () => void;
  clause: ClauseFilterValue;
  onClearClause: () => void;
  location: LocationFilterValue;
  onClearLocation: () => void;
  evidenceStatus: EvidenceStatusFilterValue;
  onClearEvidenceStatus: () => void;
  complianceResult: ComplianceResultFilterValue;
  onClearComplianceResult: () => void;
  overdueOnly: boolean;
  onClearOverdue: () => void;
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-tint py-0.5 pl-2.5 pr-1 text-[12px] font-medium text-accent-hover">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-accent hover:text-white focus:outline-none"
        aria-label={`Clear ${label}`}
      >
        <X className="h-2.5 w-2.5" aria-hidden="true" />
      </button>
    </span>
  );
}

function ActiveChips({
  search,
  onClearSearch,
  iso,
  onClearIso,
  clause,
  onClearClause,
  location,
  onClearLocation,
  evidenceStatus,
  onClearEvidenceStatus,
  complianceResult,
  onClearComplianceResult,
  overdueOnly,
  onClearOverdue,
}: ActiveChipsProps) {
  const meta = iso !== ALL_ISO ? ISO_STANDARDS.find((std) => std.code === iso) : null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Filtered by</span>
      {search && <Chip label={`"${search}"`} onClear={onClearSearch} />}
      {iso !== ALL_ISO && <Chip label={meta ? `${meta.standard} · ${iso}` : iso} onClear={onClearIso} />}
      {clause !== ALL_CLAUSES && <Chip label={clause} onClear={onClearClause} />}
      {location !== ALL_LOCATIONS && <Chip label={location} onClear={onClearLocation} />}
      {evidenceStatus !== ALL_EVIDENCE_STATUSES && <Chip label={evidenceStatus} onClear={onClearEvidenceStatus} />}
      {complianceResult !== ALL_COMPLIANCE_RESULTS && <Chip label={complianceResult} onClear={onClearComplianceResult} />}
      {overdueOnly && <Chip label="Overdue only" onClear={onClearOverdue} />}
    </div>
  );
}

// ─── Table ───────────────────────────────────────────────────────────────────

interface DocumentsTableProps {
  documents: EvidenceDocument[];
  totalCount: number;
  page: number;
  pageSize: number;
  sortState: SortState;
  onSort: (key: SortKey) => void;
  onPageChange: (page: number) => void;
  onResetFilters: () => void;
  activeIso: IsoFilterValue;
  // filter state — the toolbar lives inside the table card
  search: string;
  onSearchChange: (value: string) => void;
  iso: IsoFilterValue;
  onIsoChange: (value: IsoFilterValue) => void;
  clause: ClauseFilterValue;
  onClauseChange: (value: ClauseFilterValue) => void;
  clauseOptions: ClauseFilterValue[];
  location: LocationFilterValue;
  onLocationChange: (value: LocationFilterValue) => void;
  locationOptions: LocationFilterValue[];
  evidenceStatus: EvidenceStatusFilterValue;
  onEvidenceStatusChange: (value: EvidenceStatusFilterValue) => void;
  complianceResult: ComplianceResultFilterValue;
  onComplianceResultChange: (value: ComplianceResultFilterValue) => void;
  overdueOnly: boolean;
  onOverdueOnlyChange: (value: boolean) => void;
}

interface ColumnDef {
  key: SortKey;
  label: string;
}

const COLUMNS: ColumnDef[] = [
  { key: 'documentId', label: 'ID' },
  { key: 'name', label: 'Document' },
  { key: 'iso', label: 'Standards' },
  { key: 'clauses', label: 'Clauses' },
  { key: 'location', label: 'Location' },
  { key: 'evidenceStatus', label: 'Evidence' },
  { key: 'complianceResult', label: 'Compliance' },
  { key: 'dueDate', label: 'Due date' },
];

const TH = 'px-3 py-2 text-left text-[11px] font-semibold text-ink-secondary whitespace-nowrap';

function SortIcon({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown className="ml-1 h-2.5 w-2.5 opacity-30" aria-hidden="true" />;
  return direction === 'asc' ? (
    <ArrowUp className="ml-1 h-2.5 w-2.5" aria-hidden="true" />
  ) : (
    <ArrowDown className="ml-1 h-2.5 w-2.5" aria-hidden="true" />
  );
}

function ariaSortFor(sortState: SortState, key: SortKey): 'ascending' | 'descending' | 'none' {
  if (sortState.key !== key) return 'none';
  return sortState.direction === 'asc' ? 'ascending' : 'descending';
}

export function DocumentsTable({
  documents,
  totalCount,
  page,
  pageSize,
  sortState,
  onSort,
  onPageChange,
  onResetFilters,
  activeIso,
  search,
  onSearchChange,
  iso,
  onIsoChange,
  clause,
  onClauseChange,
  clauseOptions,
  location,
  onLocationChange,
  locationOptions,
  evidenceStatus,
  onEvidenceStatusChange,
  complianceResult,
  onComplianceResultChange,
  overdueOnly,
  onOverdueOnlyChange,
}: DocumentsTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const isEmpty = documents.length === 0;

  function toggleRow(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const hasActive =
    !!search ||
    iso !== ALL_ISO ||
    clause !== ALL_CLAUSES ||
    location !== ALL_LOCATIONS ||
    evidenceStatus !== ALL_EVIDENCE_STATUSES ||
    complianceResult !== ALL_COMPLIANCE_RESULTS ||
    overdueOnly;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <div className="overflow-hidden rounded-[10px] border border-border bg-surface shadow-sm">
      <FilterToolbar
        search={search}
        onSearchChange={onSearchChange}
        iso={iso}
        onIsoChange={onIsoChange}
        clause={clause}
        onClauseChange={onClauseChange}
        clauseOptions={clauseOptions}
        location={location}
        onLocationChange={onLocationChange}
        locationOptions={locationOptions}
        evidenceStatus={evidenceStatus}
        onEvidenceStatusChange={onEvidenceStatusChange}
        complianceResult={complianceResult}
        onComplianceResultChange={onComplianceResultChange}
        overdueOnly={overdueOnly}
        onOverdueOnlyChange={onOverdueOnlyChange}
        onReset={onResetFilters}
        hasActive={hasActive}
      />

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <span className="text-[14px] font-semibold text-ink">
          Evidence documents
          {activeIso !== ALL_ISO && (
            <span className="ml-2 rounded-full bg-accent-tint px-2 py-0.5 text-[12px] font-medium text-accent-hover">{activeIso}</span>
          )}
        </span>
        {totalCount > 0 && (
          <span className="text-[13px] tabular-nums text-ink-muted">
            {rangeStart}–{rangeEnd} / {totalCount}
          </span>
        )}
      </div>

      {isEmpty ? (
        <EmptyState onReset={onResetFilters} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-[12.5px]">
            <thead className="border-b border-border bg-surface">
              <tr>
                <th className="w-8 px-2 py-2">
                  <span className="sr-only">Expand row</span>
                </th>
                {COLUMNS.map((column) => (
                  <th key={column.key} scope="col" aria-sort={ariaSortFor(sortState, column.key)} className={TH}>
                    <button
                      type="button"
                      onClick={() => onSort(column.key)}
                      className="inline-flex items-center hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {column.label}
                      <SortIcon active={sortState.key === column.key} direction={sortState.direction} />
                    </button>
                  </th>
                ))}
                <th scope="col" className={TH}>
                  Open
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <TableRow
                  key={doc.id}
                  doc={doc}
                  isExpanded={expandedIds.has(doc.id)}
                  onToggle={() => toggleRow(doc.id)}
                  activeIso={activeIso}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isEmpty && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[13px] font-medium text-ink-secondary hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Previous
          </button>
          <span className="text-[13px] tabular-nums text-ink-muted">
            page {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[13px] font-medium text-ink-secondary hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

// Rows keep a stable height when browsing: only a capped number of clauses show by
// default, with the rest tucked behind the row's expand arrow instead of stretching
// every row to match whichever document has the most clauses.
const CLAUSE_PREVIEW = 2;

interface ClauseEntry {
  iso: IsoCode;
  abbrev: string;
  clause: ClauseCode;
}

function buildClauseEntries(standards: EvidenceDocument['standards']): ClauseEntry[] {
  return standards.flatMap((standard) =>
    standard.clauses.map((clauseCode) => ({
      iso: standard.iso,
      abbrev: getStandardName(standard.iso),
      clause: clauseCode,
    })),
  );
}

function ClausesCell({ standards, expanded }: { standards: EvidenceDocument['standards']; expanded: boolean }) {
  const entries = buildClauseEntries(standards);
  const visible = expanded ? entries : entries.slice(0, CLAUSE_PREVIEW);
  const overflow = entries.length - CLAUSE_PREVIEW;

  return (
    <div className={`flex flex-col gap-y-0.5 ${expanded ? '' : 'max-w-[280px]'}`}>
      {visible.map((entry, i) => (
        <span key={`${entry.iso}-${entry.clause}-${i}`} className="flex min-w-0 items-baseline gap-1">
          <span className="shrink-0 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-ink-muted">
            {entry.abbrev}
          </span>
          <ClauseTag iso={entry.iso} clause={entry.clause} expanded={expanded} />
        </span>
      ))}
      {!expanded && overflow > 0 && (
        <span className="text-[11.5px] font-medium text-ink-muted">+{overflow} more</span>
      )}
    </div>
  );
}

// Due date cell — plain mono date, or the overdue treatment (accent date + a
// small OVERDUE tag stacked below). Overdue is surfaced here only; it no longer
// echoes under the document name.
function DueCell({ dueDate, overdue }: { dueDate?: string; overdue: boolean }) {
  const formatted = formatDueDate(dueDate);

  if (!dueDate) {
    return <span className="font-mono text-[12px] leading-4 text-ink-muted">{formatted}</span>;
  }

  if (overdue) {
    return (
      <div className="flex flex-col items-start gap-[3px]">
        <span className="font-mono text-[12px] font-medium leading-4 text-overdue-fg">{formatted}</span>
        <span className="inline-flex items-center gap-[3px] rounded-[4px] bg-overdue-tag py-0.5 pl-1 pr-[5px] font-mono text-[10px] font-medium uppercase leading-3 tracking-[0.4px] text-overdue-fg">
          <Clock className="h-2.5 w-2.5" aria-hidden="true" />
          Overdue
        </span>
      </div>
    );
  }

  return <span className="font-mono text-[12px] leading-4 text-ink-secondary">{formatted}</span>;
}

interface TableRowProps {
  doc: EvidenceDocument;
  isExpanded: boolean;
  onToggle: () => void;
  activeIso: IsoFilterValue;
}

function TableRow({ doc, isExpanded, onToggle, activeIso }: TableRowProps) {
  const overdue = isOverdue(doc.dueDate);
  const wrapClass = isExpanded ? 'whitespace-normal break-words' : 'truncate overflow-hidden whitespace-nowrap';

  return (
    <tr
      className={`border-b border-border transition-colors ${
        isExpanded
          ? 'bg-subtle'
          : overdue
            ? 'border-l-2 border-l-overdue-accent bg-overdue-row hover:bg-overdue-tag'
            : 'border-l-2 border-l-transparent hover:bg-subtle'
      }`}
    >
      <td className="w-8 px-2 py-2 align-top">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `Collapse details for ${doc.name}` : `Expand details for ${doc.name}`}
          className="flex h-5 w-5 items-center justify-center rounded text-ink-muted transition-colors hover:bg-border hover:text-ink-secondary focus:outline-none"
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform duration-150 ${isExpanded ? '' : '-rotate-90'}`}
            aria-hidden="true"
          />
        </button>
      </td>
      <td
        className={`px-3 py-2 align-top font-mono text-[12px] text-ink-secondary ${wrapClass}`}
        title={isExpanded ? undefined : doc.documentId}
      >
        {doc.documentId}
      </td>
      <td className={`px-3 py-2 align-top ${wrapClass}`} title={isExpanded ? undefined : doc.name}>
        <div className="font-medium text-ink">{doc.name}</div>
      </td>
      <td className="px-3 py-2 align-top">
        <div className="flex flex-wrap gap-1">
          {doc.standards.map((standard) => {
            const isActive = activeIso !== ALL_ISO && standard.iso === activeIso;
            return (
              <span
                key={standard.iso}
                title={standard.iso}
                className={`inline-block rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${
                  isActive ? 'bg-accent text-white' : 'bg-standard-bg text-white'
                }`}
              >
                {getStandardName(standard.iso)}
              </span>
            );
          })}
        </div>
      </td>
      <td className="px-3 py-2 align-top">
        <ClausesCell standards={doc.standards} expanded={isExpanded} />
      </td>
      <td className={`px-3 py-2 align-top text-[12.5px] text-ink-secondary ${wrapClass}`} title={isExpanded ? undefined : doc.location}>
        {doc.location}
      </td>
      <td className="px-3 py-2 align-top">
        <EvidenceStatusBadge status={doc.evidenceStatus} />
      </td>
      <td className="px-3 py-2 align-top">
        <ComplianceResultBadge result={doc.complianceResult} />
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-top">
        <DueCell dueDate={doc.dueDate} overdue={overdue} />
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-top">
        {doc.documentUrl ? (
          <a
            href={doc.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Opens the source document"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-link hover:text-accent-hover hover:underline focus:outline-none"
            onClick={(event) => event.stopPropagation()}
          >
            Open
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">Opens the source document in SharePoint</span>
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
