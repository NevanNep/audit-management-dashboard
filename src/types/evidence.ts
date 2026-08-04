export type EvidenceStatus =
  | 'Requested'
  | 'Uploaded'
  | 'Under review'
  | 'Accepted'
  | 'Need revision';

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

export type ClauseCode = '4.1' | '4.2' | '4.3' | '4.4' | '5.1' | '5.2' | '5.3' | '6.1' | '6.2' | '6.3' | '7.1' | '7.2' | '7.3' | '7.4' | '7.5' | '7.5.1' | '7.5.2' | '7.5.3' | '8.1' | '9.1' | '9.2' | '9.2.1' | '9.2.2' | '9.3' | '9.3.1' | '9.3.2' | '9.3.3' | '10.1' | '10.2';

export type LocationName =
  | 'Jakarta'
  | 'Batam'
  | 'Singapore'
  | 'Malaysia'
  | 'Australia'
  | 'United States';

export interface EvidenceDocument {
  id: string;
  name: string;
  iso: IsoCode;
  location: LocationName;
  evidenceStatus: EvidenceStatus;
  complianceResult: ComplianceResult;
  dueDate: string;
  clauses: ClauseCode[];
  documentUrl?: string;
}

export const ALL_LOCATIONS = 'All locations';
export const ALL_EVIDENCE_STATUSES = 'All evidence statuses';
export const ALL_COMPLIANCE_RESULTS = 'All compliance results';
export const ALL_ISO = 'All ISO';

export type LocationFilterValue = typeof ALL_LOCATIONS | LocationName;
export type EvidenceStatusFilterValue = typeof ALL_EVIDENCE_STATUSES | EvidenceStatus;
export type ComplianceResultFilterValue = typeof ALL_COMPLIANCE_RESULTS | ComplianceResult;
export type IsoFilterValue = typeof ALL_ISO | IsoCode;

export interface EvidenceFilterState {
  search: string;
  iso: IsoFilterValue;
  location: LocationFilterValue;
  evidenceStatus: EvidenceStatusFilterValue;
  complianceResult: ComplianceResultFilterValue;
}

export type SortKey =
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
