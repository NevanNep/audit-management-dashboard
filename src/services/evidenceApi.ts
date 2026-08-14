import { getStandardName } from '../data/isoStandards';
import {
  ALL_CLAUSES,
  ALL_COMPLIANCE_RESULTS,
  ALL_EVIDENCE_STATUSES,
  ALL_ISO,
  ALL_LOCATIONS,
  type EvidenceFilterState,
  type IsoCode,
  type SortDirection,
  type SortKey,
} from '../types/evidence';

export interface ApiEvidenceStandard {
  standard: string;
  clauses: string[];
}

export interface ApiEvidence {
  evidenceId: string;
  documentEvidence: string;
  standards: ApiEvidenceStandard[];
  location: string;
  evidenceStatus: string;
  complianceResult: string;
  dueDate?: string;
  documentUrl: string;
}

export interface EvidencePageResponse {
  items: ApiEvidence[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ComplianceSegment {
  result: string;
  count: number;
}

export interface StandardCardStats {
  standard: string;
  total: number;
  overdueCount: number;
  segments: ComplianceSegment[];
}

export interface CardStats {
  total: number;
  overdueCount: number;
  segments: ComplianceSegment[];
}

export interface CountStat {
  value: string;
  count: number;
}

export interface EvidenceStatsResponse {
  locationOptions: string[];
  clauseOptions: string[];
  overall: CardStats;
  byStandard: StandardCardStats[];
  evidenceStatusCounts: CountStat[];
  complianceResultCounts: CountStat[];
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

function buildFilterParams(filters: EvidenceFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.iso !== ALL_ISO) params.set('standard', getStandardName(filters.iso as IsoCode));
  if (filters.clause !== ALL_CLAUSES) params.set('clause', filters.clause);
  if (filters.location !== ALL_LOCATIONS) params.set('location', filters.location);
  if (filters.evidenceStatus !== ALL_EVIDENCE_STATUSES) params.set('evidenceStatus', filters.evidenceStatus);
  if (filters.complianceResult !== ALL_COMPLIANCE_RESULTS) {
    params.set('complianceResult', filters.complianceResult);
  }
  return params;
}

async function fetchJson<T>(url: string, errorLabel: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${errorLabel} (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function fetchEvidencePage(
  filters: EvidenceFilterState,
  page: number,
  pageSize: number,
  sortKey: SortKey,
  sortDirection: SortDirection,
): Promise<EvidencePageResponse> {
  const params = buildFilterParams(filters);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  params.set('sortKey', sortKey);
  params.set('sortDirection', sortDirection);

  return fetchJson<EvidencePageResponse>(`${API_URL}/evidence?${params.toString()}`, 'evidence');
}

export function fetchEvidenceStats(filters: EvidenceFilterState): Promise<EvidenceStatsResponse> {
  const params = buildFilterParams(filters);
  return fetchJson<EvidenceStatsResponse>(`${API_URL}/evidence/stats?${params.toString()}`, 'evidence stats');
}
