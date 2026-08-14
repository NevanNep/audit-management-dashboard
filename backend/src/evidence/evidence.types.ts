export const STANDARDS_VALUES = [
  'ISMS',
  'PIMS',
  'ITSMS',
  'BCMS',
  'OHSMS',
  'ABMS',
  'EnMS',
] as const;

export type Standard = (typeof STANDARDS_VALUES)[number];

export interface EvidenceStandard {
  standard: Standard;
  clauses: string[];
}

export interface Evidence {
  evidenceId: string;
  documentEvidence: string;
  standards: EvidenceStandard[];
  location: string;
  evidenceStatus: string;
  complianceResult: string;
  dueDate?: string;
  documentUrl: string;
}

export const EVIDENCE_STATUS_VALUES = [
  'Accepted',
  'Pending Review',
  'Rejected',
  'Missing',
] as const;

export type EvidenceStatusValue = (typeof EVIDENCE_STATUS_VALUES)[number];

export const COMPLIANCE_RESULT_VALUES = [
  'Compliant',
  'Partially compliant',
  'Non-compliant',
  'Not assessed',
] as const;

export type ComplianceResultValue = (typeof COMPLIANCE_RESULT_VALUES)[number];
