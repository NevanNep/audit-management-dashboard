import { useMemo, useState } from 'react';
import { DashboardHeader } from './components/dashboard/DashboardHeader';
import { DashboardFilters } from './components/dashboard/DashboardFilters';
import { IsoStandardCards } from './components/dashboard/IsoStandardCards';
import { DocumentsChart } from './components/dashboard/DocumentsChart';
import { DocumentsTable } from './components/dashboard/DocumentsTable';
import { MOCK_EVIDENCE_DOCUMENTS } from './data/mockEvidence';
import { filterDocuments, matchesNonIsoFilters } from './utils/evidenceFilters';
import { sortDocuments } from './utils/evidenceSorting';
import {
  ALL_COMPLIANCE_RESULTS,
  ALL_EVIDENCE_STATUSES,
  ALL_ISO,
  ALL_LOCATIONS,
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
  const [filters, setFilters] = useState<EvidenceFilterState>(INITIAL_FILTERS);
  const [sortState, setSortState] = useState<SortState>(INITIAL_SORT);

  const documentsForCards = useMemo(
    () => MOCK_EVIDENCE_DOCUMENTS.filter((doc) => matchesNonIsoFilters(doc, filters)),
    [filters],
  );

  const filteredDocuments = useMemo(
    () => filterDocuments(MOCK_EVIDENCE_DOCUMENTS, filters),
    [filters],
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

        <DashboardFilters
          search={filters.search}
          onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
          location={filters.location}
          onLocationChange={(location) => setFilters((f) => ({ ...f, location }))}
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
      </div>
    </div>
  );
}

export default App;
