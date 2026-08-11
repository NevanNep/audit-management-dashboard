import {
  ALL_COMPLIANCE_RESULTS,
  ALL_EVIDENCE_STATUSES,
  type ComplianceResultFilterValue,
  type EvidenceStatusFilterValue,
} from '../types/evidence';

export const EVIDENCE_STATUS_OPTIONS: EvidenceStatusFilterValue[] = [
  ALL_EVIDENCE_STATUSES,
  'Accepted',
  'Pending Review',
  'Rejected',
  'Missing',
];

export const COMPLIANCE_RESULT_OPTIONS: ComplianceResultFilterValue[] = [
  ALL_COMPLIANCE_RESULTS,
  'Not assessed',
  'Compliant',
  'Partially compliant',
  'Non-compliant',
  'Not applicable',
];
