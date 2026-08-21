export type EvidenceStatus =
  | 'Accepted'
  | 'Pending Review'
  | 'Rejected'
  | 'Missing';

export type ComplianceResult =
  | 'Not assessed'
  | 'Compliant'
  | 'Partially compliant'
  | 'Non-compliant'
  | 'Not applicable';

export type IsoCode =
  | 'ISO 27001'
  | 'ISO 27701'
  | 'ISO 20000'
  | 'ISO 22301'
  | 'ISO 45001'
  | 'ISO 37001'
  | 'ISO 50001';

// Real clause trees vary per standard (sub-clauses, restructured sections),
// so this is intentionally an open string rather than a fixed union — the
// known set of codes actually seen in ISO source data lives in data/clauses.ts.
export type ClauseCode = string;

export type LocationName = string;

export interface EvidenceDocumentStandard {
  iso: IsoCode;
  clauses: ClauseCode[];
}

export interface EvidenceDocument {
  id: string;
  documentId: string;
  name: string;
  standards: EvidenceDocumentStandard[];
  location: LocationName;
  evidenceStatus: EvidenceStatus;
  complianceResult: ComplianceResult;
  dueDate?: string;
  documentUrl?: string;
}

export const ALL_LOCATIONS = 'All locations';
export const ALL_EVIDENCE_STATUSES = 'All evidence statuses';
export const ALL_COMPLIANCE_RESULTS = 'All compliance results';
export const ALL_ISO = 'All ISO';
export const ALL_CLAUSES = 'All clauses';

export type LocationFilterValue = typeof ALL_LOCATIONS | LocationName;
export type EvidenceStatusFilterValue = typeof ALL_EVIDENCE_STATUSES | EvidenceStatus;
export type ComplianceResultFilterValue = typeof ALL_COMPLIANCE_RESULTS | ComplianceResult;
export type IsoFilterValue = typeof ALL_ISO | IsoCode;
export type ClauseFilterValue = typeof ALL_CLAUSES | ClauseCode;

export interface EvidenceFilterState {
  search: string;
  iso: IsoFilterValue;
  clause: ClauseFilterValue;
  location: LocationFilterValue;
  evidenceStatus: EvidenceStatusFilterValue;
  complianceResult: ComplianceResultFilterValue;
  overdueOnly: boolean;
}

export type SortKey =
  | 'documentId'
  | 'name'
  | 'iso'
  | 'clauses'
  | 'location'
  | 'evidenceStatus'
  | 'complianceResult'
  | 'dueDate';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: SortKey;
  direction: SortDirection;
}
