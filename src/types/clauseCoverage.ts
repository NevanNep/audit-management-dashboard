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

// "Dual meaning" filter — rows whose evidence carries a collision-zone code
// (`8.1`) that is both a management clause and an Annex A control number.
export const ALL_MAPPINGS = 'All mappings';
export const DUAL_MEANING_ONLY = 'Dual meaning';
export type MappingFilterValue = typeof ALL_MAPPINGS | typeof DUAL_MEANING_ONLY;

export interface CoverageCounterpart {
  /** The requirement on the other page this document could equally mean. */
  code: string;
  title: string;
}

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
  /**
   * The mapped code is a bare collision-zone code (`8.1`) — both a management
   * clause and an Annex A control number. The same document is shown on the
   * clause page and the Annex A page; a reviewer should confirm the intent.
   */
  ambiguous?: boolean;
  /** When `ambiguous`, the requirement on the other page this could also mean. */
  counterpart?: CoverageCounterpart;
}

export interface ClauseCoverageClause {
  clauseCode: string;
  clauseTitle: string;
  state: CoverageState;
  inScope: boolean;
  /** At least one mapped document is a collision-zone (dual-meaning) mapping. */
  ambiguous: boolean;
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
  /** Clauses with at least one collision-zone (dual-meaning) mapping. */
  ambiguousCount: number;
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
    ambiguous: number;
    coveragePercent: number | null;
  };
  scope: {
    validated: boolean;
    note?: string;
  };
  annexA: AnnexACoverageSection;
}

// ─── Annex A controls (ISO/IEC 27001:2022) ─────────────────────────────────
// A second, self-contained requirement set that only ISO 27001 has, shown on
// its own sub-page. Coverage is computed server-side exactly like the clauses.

export type AnnexATheme =
  | 'Organizational'
  | 'People'
  | 'Physical'
  | 'Technological';

export const ANNEX_A_THEMES: AnnexATheme[] = [
  'Organizational',
  'People',
  'Physical',
  'Technological',
];

export const ALL_THEMES = 'All themes';
export type AnnexAThemeFilterValue = typeof ALL_THEMES | AnnexATheme;

export const ALL_APPLICABILITY = 'All';
export type AnnexAApplicabilityFilterValue =
  | typeof ALL_APPLICABILITY
  | 'Applicable'
  | 'Not applicable';

export interface AnnexAControl {
  code: string;
  title: string;
  theme: AnnexATheme;
  state: CoverageState;
  /** In the audit scope per the Statement of Applicability. */
  applicable: boolean;
  /** At least one mapped document is a collision-zone (dual-meaning) mapping. */
  ambiguous: boolean;
  /** SoA exclusion rationale — present only when `applicable` is false. */
  justification?: string;
  evidence: CoverageEvidenceRef[];
}

interface AnnexARollup {
  controlCount: number;
  applicableCount: number;
  coveredCount: number;
  gapCount: number;
  notApplicableCount: number;
  /** Controls with at least one collision-zone (dual-meaning) mapping. */
  ambiguousCount: number;
  coveragePercent: number | null;
}

export interface AnnexAThemeGroup extends AnnexARollup {
  theme: AnnexATheme;
  controls: AnnexAControl[];
}

export interface AnnexACoverageSection extends AnnexARollup {
  isoCode: string;
  edition: string;
  inAuditProgram: boolean;
  themes: AnnexAThemeGroup[];
  soa: {
    validated: boolean;
    note?: string;
  };
}
