import {
  ComplianceResultValue,
  Evidence,
  EvidenceStatusValue,
  Standard,
  STANDARDS_VALUES,
} from './evidence.types';
import standardClauses from './data/standard-clauses.json';
import auditScope from './data/audit-scope.json';

/**
 * Coverage is deliberately independent of Evidence Status and Compliance Result:
 *
 *  - Covered        — clause is in the audit scope and has at least one mapped
 *                     *actual* evidence document.
 *  - Gap            — clause is in the audit scope and has no actual mapped evidence.
 *  - Not Applicable — clause is outside the audit scope (standard not in the audit
 *                     programme, or the clause is an explicit scope exclusion).
 *
 * "Actual evidence" = a mapped document whose Evidence Status is Accepted,
 * Pending Review or Rejected. A `Missing` status means no document actually
 * exists yet, so it never contributes to coverage. Compliance Result plays no
 * part in the coverage decision at all.
 *
 * Clause matching is hierarchy-aware, not string-prefix based. Every clause code
 * is decomposed into dot-separated segments and the parent/child relationship is
 * resolved against the clause master (`standard-clauses.json`): evidence mapped
 * to a parent clause (e.g. `9.2`) contributes to that parent's descendant
 * requirement clauses (`9.2.1`, `9.2.2`) but never to a merely similar-looking
 * sibling (`9.20`). Evidence mapped directly to the specific child is still
 * honoured.
 */
export type CoverageState = 'Covered' | 'Gap' | 'Not Applicable';

export const ACTUAL_EVIDENCE_STATUSES: readonly EvidenceStatusValue[] = [
  'Accepted',
  'Pending Review',
  'Rejected',
];

export const STANDARD_ISO_CODES: Record<Standard, string> = {
  ISMS: 'ISO 27001',
  PIMS: 'ISO 27701',
  ITSMS: 'ISO 20000',
  BCMS: 'ISO 22301',
  OHSMS: 'ISO 45001',
  ABMS: 'ISO 37001',
  EnMS: 'ISO 50001',
};

interface ClauseNode {
  code: string;
  title: string;
}

interface AuditScopeConfig {
  program: string[];
  exclusions: Record<string, string[]>;
}

const CLAUSE_TREE = standardClauses as Record<string, ClauseNode[]>;
const SCOPE = auditScope as AuditScopeConfig;

// ─── Clause hierarchy ──────────────────────────────────────────────────────

function segmentsOf(code: string): string[] {
  return code.split('.');
}

/**
 * True when `ancestor` sits strictly above `descendant` in the clause tree —
 * i.e. its segments are a proper leading subsequence of the descendant's
 * (`9.2` → `9.2.1`), which is NOT the same as `descendant.startsWith(ancestor)`
 * (that would also match `9.2` → `9.20`).
 */
function isStrictAncestor(ancestor: string, descendant: string): boolean {
  const a = segmentsOf(ancestor);
  const d = segmentsOf(descendant);
  if (a.length >= d.length) return false;
  return a.every((segment, index) => segment === d[index]);
}

interface StandardHierarchy {
  /** Every clause code known for the standard (sections + requirements). */
  codes: string[];
  codeSet: Set<string>;
  /** Requirement-level clauses only — leaves of the tree that carry a title. */
  leaves: ClauseNode[];
  /**
   * For each leaf code, the set of clause codes whose evidence counts towards
   * it: the leaf itself plus every ancestor that actually exists in the master.
   */
  contributingCodes: Map<string, Set<string>>;
}

function buildHierarchy(nodes: ClauseNode[]): StandardHierarchy {
  const codes = nodes.map((node) => node.code);
  const codeSet = new Set(codes);

  const leaves = nodes.filter(
    (node) =>
      node.title.length > 0 &&
      !codes.some((other) => isStrictAncestor(node.code, other)),
  );

  const contributingCodes = new Map<string, Set<string>>();
  for (const leaf of leaves) {
    const set = new Set<string>([leaf.code]);
    for (const code of codes) {
      if (isStrictAncestor(code, leaf.code)) set.add(code);
    }
    contributingCodes.set(leaf.code, set);
  }

  return { codes, codeSet, leaves, contributingCodes };
}

const HIERARCHY: Record<string, StandardHierarchy> = Object.fromEntries(
  Object.entries(CLAUSE_TREE).map(([standard, nodes]) => [
    standard,
    buildHierarchy(nodes),
  ]),
);

/**
 * Normalize a raw clause token from an evidence record to a clause code known to
 * the master. Tolerates trailing descriptive text ("9.2 Internal audit") but
 * never invents a code — an unknown token resolves to `null` and simply does not
 * match anything.
 */
function canonicalizeClauseToken(
  token: string,
  hierarchy: StandardHierarchy,
): string | null {
  const trimmed = token.trim();
  if (hierarchy.codeSet.has(trimmed)) return trimmed;

  let best: string | null = null;
  for (const code of hierarchy.codeSet) {
    if (trimmed === code || trimmed.startsWith(`${code} `)) {
      if (best === null || code.length > best.length) best = code;
    }
  }
  return best;
}

// ─── Response shape ────────────────────────────────────────────────────────

export interface ClauseCoverageEvidenceRef {
  evidenceId: string;
  name: string;
  evidenceStatus: EvidenceStatusValue;
  complianceResult: ComplianceResultValue;
  documentUrl?: string;
  /** How this document reached the clause: its own code, or an ancestor. */
  mappedVia: 'exact' | 'parent';
  mappedClause: string;
}

export interface ClauseCoverageClause {
  clauseCode: string;
  clauseTitle: string;
  state: CoverageState;
  inScope: boolean;
  /** Actual mapped evidence (Missing-status rows are excluded). */
  evidence: ClauseCoverageEvidenceRef[];
}

export interface ClauseCoverageStandardGroup {
  standard: Standard;
  isoCode: string;
  inAuditProgram: boolean;
  clauseCount: number;
  /** Clauses in the audit scope (clauseCount minus Not Applicable). */
  applicableCount: number;
  coveredCount: number;
  gapCount: number;
  notApplicableCount: number;
  /** covered / applicable, 0-100, or null when nothing is applicable. */
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
  /** Provenance of the scope configuration used for Not Applicable. */
  scope: {
    validated: boolean;
    note?: string;
  };
}

export interface ClauseCoverageParams {
  /** Restrict the response to a single standard. Does not affect the coverage
   *  calculation itself — only which groups are returned. */
  standard?: Standard;
}

// ─── Calculation ───────────────────────────────────────────────────────────

function isExcludedClause(standard: Standard, clauseCode: string): boolean {
  const exclusions = SCOPE.exclusions[standard] ?? [];
  return exclusions.some(
    (excluded) =>
      clauseCode === excluded || isStrictAncestor(excluded, clauseCode),
  );
}

function isActualEvidence(evidence: Evidence): boolean {
  return ACTUAL_EVIDENCE_STATUSES.includes(
    evidence.evidenceStatus as EvidenceStatusValue,
  );
}

function coveragePercent(covered: number, applicable: number): number | null {
  if (applicable <= 0) return null;
  return Math.round((covered / applicable) * 100);
}

function evidenceForLeaf(
  actualEvidence: Evidence[],
  standard: Standard,
  leafCode: string,
  hierarchy: StandardHierarchy,
): ClauseCoverageEvidenceRef[] {
  const contributing =
    hierarchy.contributingCodes.get(leafCode) ?? new Set([leafCode]);

  const refs: ClauseCoverageEvidenceRef[] = [];
  for (const evidence of actualEvidence) {
    let matchedCode: string | null = null;
    for (const entry of evidence.standards) {
      if (entry.standard !== standard) continue;
      for (const raw of entry.clauses) {
        const code = canonicalizeClauseToken(raw, hierarchy);
        if (code !== null && contributing.has(code)) {
          // Prefer the exact-match code if this document has one.
          if (matchedCode === null || code === leafCode) matchedCode = code;
        }
      }
    }
    if (matchedCode === null) continue;

    refs.push({
      evidenceId: evidence.evidenceId,
      name: evidence.documentEvidence,
      evidenceStatus: evidence.evidenceStatus as EvidenceStatusValue,
      complianceResult: evidence.complianceResult as ComplianceResultValue,
      documentUrl: evidence.documentUrl || undefined,
      mappedVia: matchedCode === leafCode ? 'exact' : 'parent',
      mappedClause: matchedCode,
    });
  }
  return refs;
}

function buildStandardGroup(
  standard: Standard,
  actualEvidence: Evidence[],
): ClauseCoverageStandardGroup {
  const inAuditProgram = SCOPE.program.includes(standard);
  const hierarchy = HIERARCHY[standard] ?? {
    codes: [],
    codeSet: new Set<string>(),
    leaves: [],
    contributingCodes: new Map<string, Set<string>>(),
  };

  const clauses: ClauseCoverageClause[] = hierarchy.leaves.map((leaf) => {
    const inScope = inAuditProgram && !isExcludedClause(standard, leaf.code);
    const evidence = inScope
      ? evidenceForLeaf(actualEvidence, standard, leaf.code, hierarchy)
      : [];

    let state: CoverageState;
    if (!inScope) {
      state = 'Not Applicable';
    } else if (evidence.length > 0) {
      state = 'Covered';
    } else {
      state = 'Gap';
    }

    return {
      clauseCode: leaf.code,
      clauseTitle: leaf.title,
      state,
      inScope,
      evidence,
    };
  });

  const clauseCount = clauses.length;
  const coveredCount = clauses.filter((c) => c.state === 'Covered').length;
  const gapCount = clauses.filter((c) => c.state === 'Gap').length;
  const notApplicableCount = clauses.filter(
    (c) => c.state === 'Not Applicable',
  ).length;
  const applicableCount = clauseCount - notApplicableCount;

  return {
    standard,
    isoCode: STANDARD_ISO_CODES[standard],
    inAuditProgram,
    clauseCount,
    applicableCount,
    coveredCount,
    gapCount,
    notApplicableCount,
    coveragePercent: coveragePercent(coveredCount, applicableCount),
    clauses,
  };
}

export function buildClauseCoverage(
  all: Evidence[],
  params: ClauseCoverageParams = {},
): ClauseCoverageResponse {
  // Coverage never depends on how evidence was reviewed or assessed, so the only
  // evidence filter applied here is "is this an actual document?" (status is not
  // Missing). Standard/clause/status/compliance query filters are intentionally
  // ignored for the calculation.
  const actualEvidence = all.filter(isActualEvidence);

  const standards = params.standard ? [params.standard] : [...STANDARDS_VALUES];
  const groups = standards.map((standard) =>
    buildStandardGroup(standard, actualEvidence),
  );

  const covered = groups.reduce((sum, group) => sum + group.coveredCount, 0);
  const applicable = groups.reduce(
    (sum, group) => sum + group.applicableCount,
    0,
  );

  return {
    groups,
    totals: {
      clauses: groups.reduce((sum, group) => sum + group.clauseCount, 0),
      applicable,
      covered,
      gap: groups.reduce((sum, group) => sum + group.gapCount, 0),
      notApplicable: groups.reduce(
        (sum, group) => sum + group.notApplicableCount,
        0,
      ),
      coveragePercent: coveragePercent(covered, applicable),
    },
    scope: {
      validated: false,
      note: 'Scope configuration is using placeholder data pending validation.',
    },
  };
}
