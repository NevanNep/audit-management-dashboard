import { useEffect, useState } from 'react';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { DashboardHeader } from './components/dashboard/DashboardHeader';
import { AllStandardsCard } from './components/dashboard/AllStandardsCard';
import { IsoStandardCards } from './components/dashboard/IsoStandardCards';
import { ChartsPanel } from './components/dashboard/ChartsPanel';
import { DocumentsTable } from './components/dashboard/DocumentsTable';
import { fetchEvidencePage, fetchEvidenceStats, type EvidenceStatsResponse } from './services/evidenceApi';
import { mapEvidenceToDocument } from './utils/evidenceMapper';
import { ISO_STANDARDS } from './data/isoStandards';
import { GLOBAL_CLAUSES } from './data/clauses';
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

  // Sidebar standard picker: switch the standard and reveal the expanded sidebar.
  // Clause stays put — the clause list is global, so it's valid under any standard.
  function selectIso(iso: EvidenceFilterState['iso']) {
    updateFilters({ iso });
    setSidebarCollapsed(false);
  }

  const locationOptions: LocationFilterValue[] = [ALL_LOCATIONS, ...stats.locationOptions];
  const clauseOptions = [ALL_CLAUSES, ...GLOBAL_CLAUSES.map((clause) => clause.code)] as ClauseFilterValue[];

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* ── Left sidebar: flows with the page (browser-scrolling it moves the sidebar too), but its
             own content is capped to one viewport tall with its own scroll — scrolling while hovered
             over it moves only the panel, and overscroll-contain stops that from spilling into the
             page scroll once it hits the top/bottom. ── */}
      <aside
        className={`relative flex shrink-0 self-start flex-col border-r border-border bg-surface transition-[width] duration-200 ${
          sidebarCollapsed ? 'w-12' : 'w-[272px]'
        }`}
      >
        {sidebarCollapsed ? (
          <div className="flex max-h-screen flex-col items-center gap-3 overflow-y-auto overscroll-contain py-4">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              title="Expand sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-subtle hover:text-ink-secondary focus:outline-none"
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <div className="mx-auto h-px w-6 bg-border" />
            <button
              type="button"
              onClick={() => selectIso(ALL_ISO)}
              title={`All standards — ${stats.overall.total} docs`}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors focus:outline-none ${
                filters.iso === ALL_ISO ? 'bg-accent text-white' : 'text-ink-secondary hover:bg-subtle'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <div className="mx-auto h-px w-6 bg-border" />
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
                    isActive ? 'bg-accent text-white' : 'text-ink-secondary hover:bg-subtle'
                  }`}
                >
                  {std.standard.slice(0, 2)}
                  {hasRisk && !isActive && (
                    <span aria-hidden="true" className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex max-h-screen flex-col overflow-y-auto overscroll-contain">
            <DashboardHeader onCollapse={() => setSidebarCollapsed(true)} />
            <div className="flex flex-col gap-5 px-4 py-5">
              <AllStandardsCard
                overall={stats.overall}
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
          </div>
        )}
      </aside>

      {/* ── Main pane (flows normally; the browser scrolls the whole page) ── */}
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 px-6 py-4">
          {error ? (
            <div className="rounded-[10px] border border-noncompliant/30 bg-noncompliant-bg p-4 text-sm text-noncompliant">
              Couldn't load evidence from the server: {error}
            </div>
          ) : isLoading ? (
            <div className="rounded-[10px] border border-border bg-surface p-8 text-center text-sm text-ink-secondary shadow-sm">
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
                onIsoChange={(iso) => updateFilters({ iso })}
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
              <p className="mt-2 text-[11.5px] text-ink-muted">
                Read-only index — documents live in SharePoint. Rows past their due date are tinted amber.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
