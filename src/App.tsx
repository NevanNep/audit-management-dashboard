import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { DashboardHeader } from './components/dashboard/DashboardHeader';
import { AllStandardsCard } from './components/dashboard/AllStandardsCard';
import { IsoStandardCards } from './components/dashboard/IsoStandardCards';
import { ChartsPanel } from './components/dashboard/ChartsPanel';
import { DocumentsTable } from './components/dashboard/DocumentsTable';
import { fetchEvidencePage, fetchEvidenceStats, type EvidenceStatsResponse } from './services/evidenceApi';
import { mapEvidenceToDocument } from './utils/evidenceMapper';
import { ISO_STANDARDS } from './data/isoStandards';
import {
  ALL_CLAUSES,
  ALL_COMPLIANCE_RESULTS,
  ALL_EVIDENCE_STATUSES,
  ALL_ISO,
  ALL_LOCATIONS,
  type ClauseFilterValue,
  type EvidenceDocument,
  type EvidenceFilterState,
  type IsoCode,
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
  overdueOnly: false,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 1366);

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

  function selectIso(iso: EvidenceFilterState['iso']) {
    updateFilters({ iso, clause: ALL_CLAUSES });
    setSidebarCollapsed(false);
  }

  const locationOptions: LocationFilterValue[] = [ALL_LOCATIONS, ...stats.locationOptions];
  const clauseOptions = [ALL_CLAUSES, ...stats.clauseOptions] as ClauseFilterValue[];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ── Left sidebar: flows with the page (browser-scrolling it moves the sidebar too), but its
             own content is capped to one viewport tall with its own scroll — scrolling while hovered
             over it moves only the panel, and overscroll-contain stops that from spilling into the
             page scroll once it hits the top/bottom. ── */}
      <aside
        className={`relative flex shrink-0 self-start flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ${
          sidebarCollapsed ? 'w-12' : 'w-[272px]'
        }`}
      >
        {sidebarCollapsed ? (
          <div className="flex max-h-screen flex-col items-center gap-3 overflow-y-auto overscroll-contain py-4">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              title="Expand sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none"
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <div className="mx-auto h-px w-6 bg-slate-200" />
            <button
              type="button"
              onClick={() => selectIso(ALL_ISO)}
              title={`All standards — ${stats.overall.total} docs`}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors focus:outline-none ${
                filters.iso === ALL_ISO ? 'bg-accent text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <div className="mx-auto h-px w-6 bg-slate-200" />
            {ISO_STANDARDS.map((std) => {
              const stdStats = stats.byStandard.find((entry) => entry.standard === std.standard);
              const isActive = filters.iso === std.code;
              const hasRisk = stdStats?.segments.some(
                (segment) => segment.result === 'Non-compliant' || segment.result === 'Partially compliant',
              );
              return (
                <button
                  key={std.code}
                  type="button"
                  onClick={() => selectIso(std.code as IsoCode)}
                  title={`${std.standard} (${std.code}) — ${stdStats?.total ?? 0} docs`}
                  className={`relative flex h-8 w-8 items-center justify-center rounded-md text-[10px] font-bold transition-colors focus:outline-none ${
                    isActive ? 'bg-accent text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {std.standard.slice(0, 2)}
                  {hasRisk && !isActive && (
                    <span aria-hidden="true" className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              title="Collapse sidebar"
              className="absolute right-2 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <div className="flex max-h-screen flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-5 pr-10">
              <AllStandardsCard
                overall={stats.overall}
                evidenceStatusCounts={stats.evidenceStatusCounts}
                isSelected={filters.iso === ALL_ISO}
                onSelect={() => selectIso(ALL_ISO)}
              />
              <ChartsPanel
                evidenceStatusCounts={stats.evidenceStatusCounts}
                complianceResultCounts={stats.complianceResultCounts}
                stacked
              />
              <IsoStandardCards byStandard={stats.byStandard} selectedIso={filters.iso} onSelectIso={selectIso} compact />
            </div>
          </>
        )}
      </aside>

      {/* ── Main pane (flows normally; the browser scrolls the whole page) ── */}
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center border-b border-slate-200 bg-white px-6 py-3.5">
          <DashboardHeader />
        </div>

        <div className="flex-1 px-6 py-4">
          {error ? (
            <div className="rounded-[10px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              Couldn't load evidence from the server: {error}
            </div>
          ) : isLoading ? (
            <div className="rounded-[10px] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              Loading evidence...
            </div>
          ) : (
            <>
              <DocumentsTable
                documents={documents}
                totalCount={total}
                page={page}
                pageSize={PAGE_SIZE}
                sortState={sortState}
                onSort={handleSort}
                onPageChange={setPage}
                onResetFilters={handleReset}
                activeIso={filters.iso}
                search={filters.search}
                onSearchChange={(search) => updateFilters({ search })}
                iso={filters.iso}
                onIsoChange={selectIso}
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
                overdueOnly={filters.overdueOnly}
                onOverdueOnlyChange={(overdueOnly) => updateFilters({ overdueOnly })}
              />
              <p className="mt-2 text-xs text-slate-400">
                Read-only index — documents live in SharePoint. Rows past their due date are tinted.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
