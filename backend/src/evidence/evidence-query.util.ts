import {
  COMPLIANCE_RESULT_VALUES,
  ComplianceResultValue,
  Evidence,
  EVIDENCE_STATUS_VALUES,
  EvidenceStatusValue,
  Standard,
  STANDARDS_VALUES,
} from './evidence.types';

export type SortKey =
  | 'documentId'
  | 'name'
  | 'iso'
  | 'clauses'
  | 'location'
  | 'evidenceStatus'
  | 'complianceResult'
  | 'dueDate';

export const SORT_KEY_VALUES: SortKey[] = [
  'documentId',
  'name',
  'iso',
  'clauses',
  'location',
  'evidenceStatus',
  'complianceResult',
  'dueDate',
];

export type SortDirection = 'asc' | 'desc';

export interface EvidenceFilterParams {
  search?: string;
  standard?: Standard;
  clause?: string;
  location?: string;
  evidenceStatus?: EvidenceStatusValue;
  complianceResult?: ComplianceResultValue;
  overdueOnly?: boolean;
}

export interface EvidenceQuery extends EvidenceFilterParams {
  page: number;
  pageSize: number;
  sortKey: SortKey;
  sortDirection: SortDirection;
}

export interface EvidencePage {
  items: Evidence[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ComplianceSegment {
  result: ComplianceResultValue;
  count: number;
}

export interface StandardCardStats {
  standard: Standard;
  total: number;
  overdueCount: number;
  segments: ComplianceSegment[];
}

export interface CardStats {
  total: number;
  overdueCount: number;
  segments: ComplianceSegment[];
}

export interface CountStat<T extends string> {
  value: T;
  count: number;
}

export interface EvidenceStats {
  locationOptions: string[];
  clauseOptions: string[];
  overall: CardStats;
  byStandard: StandardCardStats[];
  evidenceStatusCounts: CountStat<EvidenceStatusValue>[];
  complianceResultCounts: CountStat<ComplianceResultValue>[];
}

function matchesCommonFilters(
  evidence: Evidence,
  filters: EvidenceFilterParams,
): boolean {
  const query = filters.search?.trim().toLowerCase() ?? '';
  return (
    (query === '' || evidence.documentEvidence.toLowerCase().includes(query)) &&
    (!filters.location || evidence.location === filters.location) &&
    (!filters.evidenceStatus ||
      evidence.evidenceStatus === filters.evidenceStatus) &&
    (!filters.complianceResult ||
      evidence.complianceResult === filters.complianceResult) &&
    (!filters.overdueOnly || isOverdue(evidence.dueDate))
  );
}

function matchesStandardAndClause(
  evidence: Evidence,
  standard: Standard | undefined,
  clause: string | undefined,
): boolean {
  return evidence.standards.some(
    (entry) =>
      (!standard || entry.standard === standard) &&
      (!clause || entry.clauses.includes(clause)),
  );
}

export function matchesFilters(
  evidence: Evidence,
  filters: EvidenceFilterParams,
): boolean {
  return (
    matchesCommonFilters(evidence, filters) &&
    matchesStandardAndClause(evidence, filters.standard, filters.clause)
  );
}

function sortValue(evidence: Evidence, key: SortKey): string | number {
  switch (key) {
    case 'dueDate':
      return evidence.dueDate
        ? new Date(evidence.dueDate).getTime()
        : Number.POSITIVE_INFINITY;
    case 'iso':
      return [...evidence.standards.map((s) => s.standard)].sort().join(', ');
    case 'clauses': {
      const allClauses = evidence.standards.flatMap((s) => s.clauses);
      return allClauses.length
        ? Math.min(...allClauses.map((clause) => parseFloat(clause)))
        : Number.POSITIVE_INFINITY;
    }
    case 'documentId':
      return evidence.evidenceId;
    case 'name':
      return evidence.documentEvidence;
    case 'location':
    case 'evidenceStatus':
    case 'complianceResult':
      return evidence[key];
    default:
      return '';
  }
}

export function sortEvidences(
  items: Evidence[],
  key: SortKey,
  direction: SortDirection,
): Evidence[] {
  return [...items].sort((a, b) => {
    const aValue = sortValue(a, key);
    const bValue = sortValue(b, key);
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

export function isOverdue(
  dueDate: string | undefined,
  referenceDate: Date = new Date(),
): boolean {
  return !!dueDate && new Date(dueDate) < referenceDate;
}

export function buildEvidencePage(
  all: Evidence[],
  query: EvidenceQuery,
): EvidencePage {
  const filtered = sortEvidences(
    all.filter((evidence) => matchesFilters(evidence, query)),
    query.sortKey,
    query.sortDirection,
  );
  const start = (query.page - 1) * query.pageSize;

  return {
    items: filtered.slice(start, start + query.pageSize),
    total: filtered.length,
    page: query.page,
    pageSize: query.pageSize,
  };
}

function buildCardStats(
  docs: Evidence[],
  standard: Standard | undefined,
  clause: string | undefined,
): CardStats {
  const docsHere = docs.filter((evidence) =>
    evidence.standards.some(
      (entry) =>
        (!standard || entry.standard === standard) &&
        (!clause || entry.clauses.includes(clause)),
    ),
  );
  const total = docsHere.length;
  const overdueCount = docsHere.filter((evidence) =>
    isOverdue(evidence.dueDate),
  ).length;
  const segments = COMPLIANCE_RESULT_VALUES.map((result) => ({
    result,
    count: docsHere.filter((evidence) => evidence.complianceResult === result)
      .length,
  })).filter((segment) => segment.count > 0);

  return { total, overdueCount, segments };
}

export function buildEvidenceStats(
  all: Evidence[],
  filters: EvidenceFilterParams,
): EvidenceStats {
  const locationOptions = Array.from(
    new Set(all.map((evidence) => evidence.location)),
  ).sort();

  const clauseOptions = Array.from(
    new Set(
      all
        .flatMap((evidence) => evidence.standards)
        .filter(
          (entry) => !filters.standard || entry.standard === filters.standard,
        )
        .flatMap((entry) => entry.clauses),
    ),
  ).sort();

  const cardBase = all.filter((evidence) =>
    matchesCommonFilters(evidence, filters),
  );

  const overall = buildCardStats(cardBase, undefined, filters.clause);
  const byStandard = STANDARDS_VALUES.map((standard) => ({
    standard,
    ...buildCardStats(cardBase, standard, filters.clause),
  }));

  const fullyFiltered = all.filter((evidence) =>
    matchesFilters(evidence, filters),
  );
  const evidenceStatusCounts = EVIDENCE_STATUS_VALUES.map((status) => ({
    value: status,
    count: fullyFiltered.filter(
      (evidence) => evidence.evidenceStatus === status,
    ).length,
  })).filter((stat) => stat.count > 0);
  const complianceResultCounts = COMPLIANCE_RESULT_VALUES.map((result) => ({
    value: result,
    count: fullyFiltered.filter(
      (evidence) => evidence.complianceResult === result,
    ).length,
  })).filter((stat) => stat.count > 0);

  return {
    locationOptions,
    clauseOptions,
    overall,
    byStandard,
    evidenceStatusCounts,
    complianceResultCounts,
  };
}
