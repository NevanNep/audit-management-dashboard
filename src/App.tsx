import { useEffect, useMemo, useState } from 'react';
import { DashboardHeader } from './components/dashboard/DashboardHeader';
import { DashboardFilters } from './components/dashboard/DashboardFilters';
import { IsoStandardCards } from './components/dashboard/IsoStandardCards';
import { DocumentsChart } from './components/dashboard/DocumentsChart';
import { DocumentsTable } from './components/dashboard/DocumentsTable';
import { fetchEvidence } from './services/evidenceApi';
import { mapEvidenceToDocument } from './utils/evidenceMapper';
import { filterDocuments, matchesNonIsoFilters } from './utils/evidenceFilters';
import { sortDocuments } from './utils/evidenceSorting';
import {
  ALL_COMPLIANCE_RESULTS,
  ALL_EVIDENCE_STATUSES,
  ALL_ISO,
  ALL_LOCATIONS,
  type EvidenceDocument,
  type EvidenceFilterState,
  type SortKey,
  type SortState,
} from './types/evidence';

const INITIAL_FILTERS: EvidenceFilterState = {
  search: '',
  iso: ALL_ISO,
  location: ALL_LOCATIONS,
  evidenceStatus: ALL_EVIDENCE_STATUSES,
  complianceResult: ALL_COMPLIANCE_RESULTS,
};

const INITIAL_SORT: SortState = { key: 'dueDate', direction: 'asc' };

function App() {
  const [documents, setDocuments] = useState<EvidenceDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EvidenceFilterState>(INITIAL_FILTERS);
  const [sortState, setSortState] = useState<SortState>(INITIAL_SORT);

  useEffect(() => {
    let cancelled = false;

    fetchEvidence()
      .then((records) => {
        if (cancelled) return;
        setDocuments(records.map(mapEvidenceToDocument));
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load evidence.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const locationOptions = useMemo(
    () => [ALL_LOCATIONS, ...Array.from(new Set(documents.map((doc) => doc.location))).sort()],
    [documents],
  );

  const documentsForCards = useMemo(
    () => documents.filter((doc) => matchesNonIsoFilters(doc, filters)),
    [documents, filters],
  );

  const filteredDocuments = useMemo(
    () => filterDocuments(documents, filters),
    [documents, filters],
  );

  const sortedDocuments = useMemo(
    () => sortDocuments(filteredDocuments, sortState.key, sortState.direction),
    [filteredDocuments, sortState],
  );

  function handleSort(key: SortKey) {
    setSortState((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  function handleReset() {
    setFilters(INITIAL_FILTERS);
  }

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
              onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
              location={filters.location}
              onLocationChange={(location) => setFilters((f) => ({ ...f, location }))}
              locationOptions={locationOptions}
              evidenceStatus={filters.evidenceStatus}
              onEvidenceStatusChange={(evidenceStatus) => setFilters((f) => ({ ...f, evidenceStatus }))}
              complianceResult={filters.complianceResult}
              onComplianceResultChange={(complianceResult) => setFilters((f) => ({ ...f, complianceResult }))}
              onReset={handleReset}
            />

            <IsoStandardCards
              documentsForCards={documentsForCards}
              selectedIso={filters.iso}
              onSelectIso={(iso) => setFilters((f) => ({ ...f, iso }))}
            />

            <DocumentsChart documents={filteredDocuments} />

            <DocumentsTable
              documents={sortedDocuments}
              totalCount={filteredDocuments.length}
              sortState={sortState}
              onSort={handleSort}
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
