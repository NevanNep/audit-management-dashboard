import {
  ALL_COMPLIANCE_RESULTS,
  ALL_EVIDENCE_STATUSES,
  ALL_LOCATIONS,
  type ComplianceResultFilterValue,
  type EvidenceStatusFilterValue,
  type LocationFilterValue,
} from '../types/evidence';

export const LOCATION_OPTIONS: LocationFilterValue[] = [
  ALL_LOCATIONS,
  'Jakarta',
  'Batam',
  'Singapore',
  'Malaysia',
  'Australia',
  'United States',
];

export const EVIDENCE_STATUS_OPTIONS: EvidenceStatusFilterValue[] = [
  ALL_EVIDENCE_STATUSES,
  'Requested',
  'Uploaded',
  'Under review',
  'Accepted',
  'Need revision',
];

export const COMPLIANCE_RESULT_OPTIONS: ComplianceResultFilterValue[] = [
  ALL_COMPLIANCE_RESULTS,
  'Not assessed',
  'Compliant',
  'Partially compliant',
  'Non-compliant',
  'Not applicable',
];
