export interface Evidence {
  documentId: string;
  document: string;
  standards: string;
  clause: string;
  location: string;
  evidenceStatus: string;
  complianceResult: string;
  dueDate: string;
  documentUrl: string;
}

export const STANDARDS_VALUES = [
  'ISMS',
  'ITSMS',
  'PIMS',
  'BCMS',
  'ABMS',
  'OHSMS',
  'ENMS',
] as const;

export const EVIDENCE_STATUS_VALUES = [
  'Accepted',
  'Pending Review',
  'Rejected',
  'Missing',
] as const;

export const COMPLIANCE_RESULT_VALUES = [
  'Compliant',
  'Partially compliant',
  'Non-compliant',
  'Not assessed',
] as const;
