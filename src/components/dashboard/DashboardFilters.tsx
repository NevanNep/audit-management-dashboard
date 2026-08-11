import { Search } from 'lucide-react';
import { COMPLIANCE_RESULT_OPTIONS, EVIDENCE_STATUS_OPTIONS } from '../../data/filterOptions';
import type {
  ComplianceResultFilterValue,
  EvidenceStatusFilterValue,
  LocationFilterValue,
} from '../../types/evidence';

interface DashboardFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  location: LocationFilterValue;
  onLocationChange: (value: LocationFilterValue) => void;
  locationOptions: LocationFilterValue[];
  evidenceStatus: EvidenceStatusFilterValue;
  onEvidenceStatusChange: (value: EvidenceStatusFilterValue) => void;
  complianceResult: ComplianceResultFilterValue;
  onComplianceResultChange: (value: ComplianceResultFilterValue) => void;
  onReset: () => void;
}

const selectClass =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1';

export function DashboardFilters({
  search,
  onSearchChange,
  location,
  onLocationChange,
  locationOptions,
  evidenceStatus,
  onEvidenceStatusChange,
  complianceResult,
  onComplianceResultChange,
  onReset,
}: DashboardFiltersProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="relative min-w-[220px] flex-1 basis-60">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <label htmlFor="document-search" className="sr-only">
          Search document name
        </label>
        <input
          id="document-search"
          type="text"
          placeholder="Search document name..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full rounded-md border border-slate-300 bg-slate-50 py-2 pl-8 pr-3 text-[13.5px] text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
        />
      </div>

      <div>
        <label htmlFor="location-filter" className="sr-only">
          Location
        </label>
        <select
          id="location-filter"
          value={location}
          onChange={(event) => onLocationChange(event.target.value as LocationFilterValue)}
          className={selectClass}
        >
          {locationOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="evidence-status-filter" className="sr-only">
          Evidence status
        </label>
        <select
          id="evidence-status-filter"
          value={evidenceStatus}
          onChange={(event) => onEvidenceStatusChange(event.target.value as EvidenceStatusFilterValue)}
          className={selectClass}
        >
          {EVIDENCE_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="compliance-result-filter" className="sr-only">
          Compliance result
        </label>
        <select
          id="compliance-result-filter"
          value={complianceResult}
          onChange={(event) => onComplianceResultChange(event.target.value as ComplianceResultFilterValue)}
          className={selectClass}
        >
          {COMPLIANCE_RESULT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
      >
        Reset filters
      </button>
    </div>
  );
}
