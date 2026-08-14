import { ChevronDown, Search } from 'lucide-react';
import { CLAUSE_LABELS } from '../../data/clauses';
import { COMPLIANCE_RESULT_OPTIONS, EVIDENCE_STATUS_OPTIONS } from '../../data/filterOptions';
import type {
  ClauseFilterValue,
  ComplianceResultFilterValue,
  EvidenceStatusFilterValue,
  LocationFilterValue,
} from '../../types/evidence';

interface DashboardFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
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
}

const selectClass =
  'appearance-none rounded-full border border-slate-200 bg-slate-50 py-2 pl-3.5 pr-8 text-[13px] text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1';

function Select({
  id,
  value,
  onChange,
  children,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={selectClass}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
    </div>
  );
}

export function DashboardFilters({
  search,
  onSearchChange,
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
}: DashboardFiltersProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="relative min-w-[240px] flex-1 basis-72">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <label htmlFor="document-search" className="sr-only">
          Search documents, IDs, clauses
        </label>
        <input
          id="document-search"
          type="text"
          placeholder="Search documents, IDs, clauses..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-[13.5px] text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
        />
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={overdueOnly}
        onClick={() => onOverdueOnlyChange(!overdueOnly)}
        className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-2 pl-1.5 pr-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
      >
        <span
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
            overdueOnly ? 'bg-accent' : 'bg-slate-300'
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              overdueOnly ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </span>
        <span className="text-[13px] font-medium text-slate-700">Overdue</span>
      </button>

      <Select id="location-filter" value={location} onChange={(value) => onLocationChange(value as LocationFilterValue)}>
        {locationOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>

      <Select
        id="evidence-status-filter"
        value={evidenceStatus}
        onChange={(value) => onEvidenceStatusChange(value as EvidenceStatusFilterValue)}
      >
        {EVIDENCE_STATUS_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>

      <Select
        id="compliance-result-filter"
        value={complianceResult}
        onChange={(value) => onComplianceResultChange(value as ComplianceResultFilterValue)}
      >
        {COMPLIANCE_RESULT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>

      <Select id="clause-filter" value={clause} onChange={(value) => onClauseChange(value as ClauseFilterValue)}>
        {clauseOptions.map((option) => (
          <option key={option} value={option}>
            {option in CLAUSE_LABELS ? `${option} — ${CLAUSE_LABELS[option as keyof typeof CLAUSE_LABELS]}` : option}
          </option>
        ))}
      </Select>

      <button
        type="button"
        onClick={onReset}
        className="ml-auto rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
      >
        Reset filters
      </button>
    </div>
  );
}
