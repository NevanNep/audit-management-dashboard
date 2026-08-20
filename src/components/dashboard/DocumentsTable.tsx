import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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

const selectClass = (active: boolean) =>
  `h-7 rounded-md border px-2 text-[12.5px] transition-colors focus:outline-none focus:ring-1 focus:ring-accent ${
    active ? 'border-accent bg-accent-tint font-medium text-accent-hover' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
  }`;

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
    <div className="bg-slate-50/70 px-4 py-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <label htmlFor="documents-search" className="sr-only">
            Search documents
          </label>
          <input
            id="documents-search"
            type="search"
            placeholder="Search documents…"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className={`h-7 w-44 rounded-md border pl-7 pr-2.5 text-[12.5px] transition-colors focus:outline-none focus:ring-1 focus:ring-accent ${
              search
                ? 'border-accent bg-accent-tint text-accent-hover placeholder:text-accent-hover/60'
                : 'border-slate-200 bg-white text-slate-600 placeholder:text-slate-400 hover:border-slate-300'
            }`}
          />
        </div>

        <span className="h-4 w-px bg-slate-200" />

        <select
          value={iso}
          onChange={(event) => onIsoChange(event.target.value as IsoFilterValue)}
          className={selectClass(iso !== ALL_ISO)}
        >
          <option value={ALL_ISO}>All standards</option>
          {ISO_STANDARDS.map((std) => (
            <option key={std.code} value={std.code}>
              {std.standard} · {std.code}
            </option>
          ))}
        </select>

        <select
          value={clause}
          onChange={(event) => onClauseChange(event.target.value as ClauseFilterValue)}
          className={selectClass(clause !== ALL_CLAUSES)}
        >
          <option value={ALL_CLAUSES}>All clauses</option>
          {clauseOptions
            .filter((option) => option !== ALL_CLAUSES)
            .map((option) => (
              <option key={option} value={option}>
                {option in CLAUSE_LABELS ? `${option} — ${CLAUSE_LABELS[option as keyof typeof CLAUSE_LABELS]}` : option}
              </option>
            ))}
        </select>

        <select
          value={location}
          onChange={(event) => onLocationChange(event.target.value as LocationFilterValue)}
          className={selectClass(location !== ALL_LOCATIONS)}
        >
          {locationOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          value={evidenceStatus}
          onChange={(event) => onEvidenceStatusChange(event.target.value as EvidenceStatusFilterValue)}
          className={selectClass(evidenceStatus !== ALL_EVIDENCE_STATUSES)}
        >
          {EVIDENCE_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          value={complianceResult}
          onChange={(event) => onComplianceResultChange(event.target.value as ComplianceResultFilterValue)}
          className={selectClass(complianceResult !== ALL_COMPLIANCE_RESULTS)}
        >
          {COMPLIANCE_RESULT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <label
          className={`flex h-7 cursor-pointer select-none items-center gap-1.5 rounded-md border px-2 text-[12.5px] transition-colors ${
            overdueOnly ? 'border-accent bg-accent-tint font-medium text-accent-hover' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(event) => onOverdueOnlyChange(event.target.checked)}
            className="h-3 w-3 rounded accent-accent"
          />
          Overdue
        </label>

        {hasActive && (
          <>
            <span className="h-4 w-px bg-slate-200" />
            <button
              type="button"
              onClick={onReset}
              className="flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-[12.5px] font-medium text-slate-500 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none"
            >
              <RotateCcw className="h-2.5 w-2.5" aria-hidden="true" />
              Reset
            </button>
          </>
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
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Filtered by</span>
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

const TH = 'px-3 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap';

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
    <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-sm">
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

      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <span className="text-[14.5px] font-semibold text-slate-800">
          Evidence documents
          {activeIso !== ALL_ISO && (
            <span className="ml-2 rounded-full bg-accent-tint px-2 py-0.5 text-[12px] font-medium text-accent-hover">{activeIso}</span>
          )}
        </span>
        {totalCount > 0 && (
          <span className="text-[13px] text-slate-400">
            {rangeStart}–{rangeEnd} of {totalCount}
          </span>
        )}
      </div>

      {isEmpty ? (
        <EmptyState onReset={onResetFilters} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-[13.5px]">
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr>
                <th className="w-8 px-2 py-3">
                  <span className="sr-only">Expand row</span>
                </th>
                {COLUMNS.map((column) => (
                  <th key={column.key} scope="col" aria-sort={ariaSortFor(sortState, column.key)} className={TH}>
                    <button
                      type="button"
                      onClick={() => onSort(column.key)}
                      className="inline-flex items-center hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {column.label}
                      <SortIcon active={sortState.key === column.key} direction={sortState.direction} />
                    </button>
                  </th>
                ))}
                <th scope="col" className={TH}>
                  Action
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
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Previous
          </button>
          <span className="text-[13px] text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
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
const CLAUSE_PREVIEW = 3;

interface ClauseEntry {
  iso: IsoCode;
  abbrev: string | null;
  clause: ClauseCode;
}

function buildClauseEntries(standards: EvidenceDocument['standards']): ClauseEntry[] {
  const multiStandard = standards.length > 1;
  return standards.flatMap((standard) =>
    standard.clauses.map((clauseCode) => ({
      iso: standard.iso,
      abbrev: multiStandard ? getStandardName(standard.iso) : null,
      clause: clauseCode,
    })),
  );
}

function ClausesCell({ standards, expanded }: { standards: EvidenceDocument['standards']; expanded: boolean }) {
  const entries = buildClauseEntries(standards);
  const visible = expanded ? entries : entries.slice(0, CLAUSE_PREVIEW);
  const overflow = entries.length - CLAUSE_PREVIEW;

  return (
    <div className={expanded ? 'flex flex-wrap items-baseline gap-x-1 gap-y-1' : 'flex items-baseline gap-x-1 overflow-hidden'}>
      {visible.map((entry, i) => (
        <span key={`${entry.iso}-${entry.clause}-${i}`} className="inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap">
          {entry.abbrev && <span className="font-mono text-[10.5px] font-medium text-slate-400">{entry.abbrev}</span>}
          <ClauseTag iso={entry.iso} clause={entry.clause} expanded={expanded} />
          {i < visible.length - 1 && <span className="text-slate-300">,</span>}
        </span>
      ))}
      {!expanded && overflow > 0 && (
        <span className="shrink-0 whitespace-nowrap text-[11.5px] font-medium text-slate-400">+{overflow} more</span>
      )}
    </div>
  );
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
    <tr className={`border-b border-slate-100 transition-colors ${isExpanded ? 'bg-slate-50/80' : overdue ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50'}`}>
      <td className="w-8 px-2 py-3 align-top">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `Collapse details for ${doc.name}` : `Expand details for ${doc.name}`}
          className="flex h-5 w-5 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 focus:outline-none"
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform duration-150 ${isExpanded ? '' : '-rotate-90'}`}
            aria-hidden="true"
          />
        </button>
      </td>
      <td
        className={`px-3 py-3 align-top font-mono text-[12.5px] text-slate-500 ${wrapClass}`}
        title={isExpanded ? undefined : doc.documentId}
      >
        {doc.documentId}
      </td>
      <td className={`px-3 py-3 align-top ${wrapClass}`} title={isExpanded ? undefined : doc.name}>
        <div className="font-medium text-slate-800">{doc.name}</div>
        {overdue && <span className="text-[11px] font-semibold text-amber-700">overdue</span>}
      </td>
      <td className="px-3 py-3 align-top">
        <div className="flex flex-wrap gap-1">
          {doc.standards.map((standard) => {
            const isActive = activeIso !== ALL_ISO && standard.iso === activeIso;
            return (
              <span
                key={standard.iso}
                title={standard.iso}
                className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                  isActive ? 'bg-accent text-white' : 'bg-accent-tint text-accent-hover'
                }`}
              >
                {getStandardName(standard.iso)}
              </span>
            );
          })}
        </div>
      </td>
      <td className="px-3 py-3 align-top">
        <ClausesCell standards={doc.standards} expanded={isExpanded} />
      </td>
      <td className={`px-3 py-3 align-top text-[13.5px] text-slate-500 ${wrapClass}`} title={isExpanded ? undefined : doc.location}>
        {doc.location}
      </td>
      <td className="px-3 py-3 align-top">
        <EvidenceStatusBadge status={doc.evidenceStatus} />
      </td>
      <td className="px-3 py-3 align-top">
        <ComplianceResultBadge result={doc.complianceResult} />
      </td>
      <td className="whitespace-nowrap px-3 py-3 align-top font-mono text-[12.5px] text-slate-500">
        {formatDueDate(doc.dueDate)}
      </td>
      <td className="whitespace-nowrap px-3 py-3 align-top">
        {doc.documentUrl ? (
          <a
            href={doc.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Opens the source document"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:text-accent-hover hover:underline focus:outline-none"
            onClick={(event) => event.stopPropagation()}
          >
            Open
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">Opens the source document in SharePoint</span>
          </a>
        ) : (
          <span className="text-[13px] text-slate-300" title="No source document uploaded yet">
            Not available
          </span>
        )}
      </td>
    </tr>
  );
}
