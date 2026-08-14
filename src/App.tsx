import { useEffect, useState } from 'react';
import { DashboardHeader } from './components/dashboard/DashboardHeader';
import { DashboardFilters } from './components/dashboard/DashboardFilters';
import { IsoStandardCards } from './components/dashboard/IsoStandardCards';
import { DocumentsChart } from './components/dashboard/DocumentsChart';
import { ComplianceResultChart } from './components/dashboard/ComplianceResultChart';
import { DocumentsTable } from './components/dashboard/DocumentsTable';
import { fetchEvidencePage, fetchEvidenceStats, type EvidenceStatsResponse } from './services/evidenceApi';
import { mapEvidenceToDocument } from './utils/evidenceMapper';
import {
  ALL_CLAUSES,
  ALL_COMPLIANCE_RESULTS,
  ALL_EVIDENCE_STATUSES,
  ALL_ISO,
  ALL_LOCATIONS,
  type ClauseFilterValue,
  type EvidenceDocument,
  type EvidenceFilterState,
  type LocationFilterValue,
  type SortKey,
  type SortState,
} from './types/evidence';

const INITIAL_FILTERS: EvidenceFilterState = {
  search: '',
  iso: ALL_ISO,
  clause: ALL_CLAUSES,
  location: ALL_LOCATIONS,
  evidenceStatus: ALL_EVIDENCE_STATUSES,
  complianceResult: ALL_COMPLIANCE_RESULTS,
};

const INITIAL_SORT: SortState = { key: 'documentId', direction: 'asc' };
const PAGE_SIZE = 10;

const EMPTY_STATS: EvidenceStatsResponse = {
  locationOptions: [],
  clauseOptions: [],
  overall: { total: 0, overdueCount: 0, segments: [] },
  byStandard: [],
  evidenceStatusCounts: [],
  complianceResultCounts: [],
};

function App() {
  const [documents, setDocuments] = useState<EvidenceDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<EvidenceStatsResponse>(EMPTY_STATS);
  const [filters, setFilters] = useState<EvidenceFilterState>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState<SortState>(INITIAL_SORT);
  const [error, setError] = useState<string | null>(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);

  const requestKey = JSON.stringify([filters, page, sortState]);
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    let cancelled = false;

    fetchEvidencePage(filters, page, PAGE_SIZE, sortState.key, sortState.direction)
      .then((res) => {
        if (cancelled) return;
        setDocuments(res.items.map(mapEvidenceToDocument));
        setTotal(res.total);
        setError(null);
        setLoadedRequestKey(requestKey);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load evidence.');
        setLoadedRequestKey(requestKey);
      });

    return () => {
      cancelled = true;
    };
  }, [filters, page, sortState, requestKey]);

  useEffect(() => {
    let cancelled = false;

    fetchEvidenceStats(filters)
      .then((res) => {
        if (!cancelled) setStats(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load evidence stats.');
      });

    return () => {
      cancelled = true;
    };
  }, [filters]);

  function updateFilters(patch: Partial<EvidenceFilterState>) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }

  function handleSort(key: SortKey) {
    setSortState((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
    setPage(1);
  }

  function handleReset() {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  }

  const locationOptions: LocationFilterValue[] = [ALL_LOCATIONS, ...stats.locationOptions];
  const clauseOptions = [ALL_CLAUSES, ...stats.clauseOptions] as ClauseFilterValue[];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1440px] px-6 py-8 sm:px-8 md:px-12 md:py-10">
        <DashboardHeader />

        {error ? (
          <div className="mb-5 rounded-[10px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Couldn't load evidence from the server: {error}
          </div>
        ) : isLoading ? (
          <div className="mb-5 rounded-[10px] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Loading evidence...
          </div>
        ) : (
          <>
            <DashboardFilters
              search={filters.search}
              onSearchChange={(search) => updateFilters({ search })}
              clause={filters.clause}
              onClauseChange={(clause) => updateFilters({ clause })}
              clauseOptions={clauseOptions}
              location={filters.location}
              onLocationChange={(location) => updateFilters({ location })}
              locationOptions={locationOptions}
              evidenceStatus={filters.evidenceStatus}
              onEvidenceStatusChange={(evidenceStatus) => updateFilters({ evidenceStatus })}
              complianceResult={filters.complianceResult}
              onComplianceResultChange={(complianceResult) => updateFilters({ complianceResult })}
              onReset={handleReset}
            />

            <IsoStandardCards
              overall={stats.overall}
              byStandard={stats.byStandard}
              selectedIso={filters.iso}
              onSelectIso={(iso) => updateFilters({ iso, clause: ALL_CLAUSES })}
            />

            <div className="mb-6 flex flex-wrap gap-6">
              <DocumentsChart counts={stats.evidenceStatusCounts} />
              <ComplianceResultChart counts={stats.complianceResultCounts} />
            </div>

            <DocumentsTable
              documents={documents}
              totalCount={total}
              page={page}
              pageSize={PAGE_SIZE}
              sortState={sortState}
              onSort={handleSort}
              onPageChange={setPage}
              onResetFilters={handleReset}
            />

            <p className="text-xs text-slate-500">
              Read-only index — documents live in SharePoint. Rows past their due date are tinted regardless of
              evidence status.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
