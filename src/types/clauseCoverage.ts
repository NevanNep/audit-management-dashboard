import type { ComplianceResult, EvidenceStatus } from './evidence';

// Coverage is computed server-side (GET /api/evidence/clause-coverage) and is
// deliberately independent of Evidence Status and Compliance Result:
//   Covered        — in-scope clause with ≥1 mapped actual evidence document
//   Gap            — in-scope clause with no actual mapped evidence
//   Not Applicable — clause outside the audit scope
// "Actual evidence" = a mapped document whose status is Accepted, Pending
// Review or Rejected. Missing is not an actual document. Compliance Result
// never affects the state. Clause matching is hierarchy-aware: a document mapped
// to a parent clause counts towards its descendant requirement clauses.
export type CoverageState = 'Covered' | 'Gap' | 'Not Applicable';

export const ALL_COVERAGE_STATES = 'All coverage';
export type CoverageStateFilterValue = typeof ALL_COVERAGE_STATES | CoverageState;

export interface CoverageEvidenceRef {
  evidenceId: string;
  name: string;
  evidenceStatus: EvidenceStatus;
  complianceResult: ComplianceResult;
  documentUrl?: string;
  /** Whether the document maps to this exact clause or to an ancestor. */
  mappedVia: 'exact' | 'parent';
  /** The clause code the document is actually mapped to. */
  mappedClause: string;
}

export interface ClauseCoverageClause {
  clauseCode: string;
  clauseTitle: string;
  state: CoverageState;
  inScope: boolean;
  /** Actual mapped evidence only (Missing-status rows are excluded server-side). */
  evidence: CoverageEvidenceRef[];
}

export interface ClauseCoverageStandardGroup {
  /** Management-system abbreviation, e.g. "ISMS". */
  standard: string;
  /** e.g. "ISO 27001". */
  isoCode: string;
  inAuditProgram: boolean;
  clauseCount: number;
  /** Clauses in the audit scope (clauseCount minus Not Applicable). */
  applicableCount: number;
  coveredCount: number;
  gapCount: number;
  notApplicableCount: number;
  /** covered / applicable, 0–100, or null when nothing is applicable. */
  coveragePercent: number | null;
  clauses: ClauseCoverageClause[];
}

export interface ClauseCoverageResponse {
  groups: ClauseCoverageStandardGroup[];
  totals: {
    clauses: number;
    applicable: number;
    covered: number;
    gap: number;
    notApplicable: number;
    coveragePercent: number | null;
  };
  scope: {
    validated: boolean;
    note?: string;
  };
}
