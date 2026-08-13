import {
  ALL_CLAUSES,
  ALL_COMPLIANCE_RESULTS,
  ALL_EVIDENCE_STATUSES,
  ALL_ISO,
  ALL_LOCATIONS,
  type EvidenceDocument,
  type EvidenceFilterState,
} from '../types/evidence';

/** Applies every filter except ISO — used to compute ISO-card totals that stay stable while switching standards. */
export function matchesNonIsoFilters(
  doc: EvidenceDocument,
  filters: Pick<EvidenceFilterState, 'search' | 'location' | 'evidenceStatus' | 'complianceResult'>,
): boolean {
  const query = filters.search.trim().toLowerCase();
  return (
    (query === '' || doc.name.toLowerCase().includes(query)) &&
    (filters.location === ALL_LOCATIONS || doc.location === filters.location) &&
    (filters.evidenceStatus === ALL_EVIDENCE_STATUSES || doc.evidenceStatus === filters.evidenceStatus) &&
    (filters.complianceResult === ALL_COMPLIANCE_RESULTS || doc.complianceResult === filters.complianceResult)
  );
}

export function filterDocuments(
  docs: EvidenceDocument[],
  filters: EvidenceFilterState,
): EvidenceDocument[] {
  return docs.filter(
    (doc) =>
      matchesNonIsoFilters(doc, filters) &&
      doc.standards.some(
        (standard) =>
          (filters.iso === ALL_ISO || standard.iso === filters.iso) &&
          (filters.clause === ALL_CLAUSES || standard.clauses.includes(filters.clause)),
      ),
  );
}
