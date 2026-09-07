import {
  ComplianceResultValue,
  Evidence,
  EvidenceStatusValue,
  Standard,
  STANDARDS_VALUES,
} from './evidence.types';
import standardClauses from './data/standard-clauses.json';
import auditScope from './data/audit-scope.json';
import annexAControls from './data/annex-a-controls.json';
import annexASoa from './data/annex-a-soa.json';

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

export interface CoverageCounterpart {
  /** The requirement the same document could equally have been mapped to. */
  code: string;
  title: string;
}

export interface ClauseCoverageEvidenceRef {
  evidenceId: string;
  name: string;
  evidenceStatus: EvidenceStatusValue;
  complianceResult: ComplianceResultValue;
  documentUrl?: string;
  /** How this document reached the clause: its own code, or an ancestor. */
  mappedVia: 'exact' | 'parent';
  mappedClause: string;
  /**
   * The mapped token is a bare collision-zone code (`8.1`) that is both a
   * management clause and an Annex A control number. The same document is
   * listed on the clause page and the Annex A page; a reviewer should confirm
   * which was intended. See COLLISION_ZONE_CODES.
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
  /** Clauses with at least one collision-zone (dual-meaning) mapping. */
  ambiguousCount: number;
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
    /** Management clauses with a collision-zone (dual-meaning) mapping. */
    ambiguous: number;
    coveragePercent: number | null;
  };
  /** Provenance of the scope configuration used for Not Applicable. */
  scope: {
    validated: boolean;
    note?: string;
  };
  /** ISO/IEC 27001:2022 Annex A control coverage — a separate requirement set
   *  from the management-system clauses above, always computed for ISO 27001. */
  annexA: AnnexACoverageSection;
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

function evidenceRef(
  evidence: Evidence,
  extra: Partial<ClauseCoverageEvidenceRef> &
    Pick<ClauseCoverageEvidenceRef, 'mappedVia' | 'mappedClause'>,
): ClauseCoverageEvidenceRef {
  return {
    evidenceId: evidence.evidenceId,
    name: evidence.documentEvidence,
    evidenceStatus: evidence.evidenceStatus as EvidenceStatusValue,
    complianceResult: evidence.complianceResult as ComplianceResultValue,
    documentUrl: evidence.documentUrl || undefined,
    ...extra,
  };
}

/** Merge two ref lists, keeping the first occurrence of each evidence id. */
function mergeEvidenceRefs(
  primary: ClauseCoverageEvidenceRef[],
  extra: ClauseCoverageEvidenceRef[],
): ClauseCoverageEvidenceRef[] {
  const seen = new Set(primary.map((ref) => ref.evidenceId));
  return [...primary, ...extra.filter((ref) => !seen.has(ref.evidenceId))];
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

    // A bare management-clause token that is also an Annex A control number
    // (`8.1` ~ `A.8.1`): flag it and mirror it onto the Annex A page.
    const dualMeaning =
      standard === ANNEX_A_STANDARD && COLLISION_ZONE_CODES.has(matchedCode);

    refs.push(
      evidenceRef(evidence, {
        mappedVia: matchedCode === leafCode ? 'exact' : 'parent',
        mappedClause: matchedCode,
        ...(dualMeaning
          ? { ambiguous: true, counterpart: annexACounterpartOf(matchedCode) }
          : {}),
      }),
    );
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
      ambiguous: evidence.some((ref) => ref.ambiguous === true),
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
  const ambiguousCount = clauses.filter((c) => c.ambiguous).length;

  return {
    standard,
    isoCode: STANDARD_ISO_CODES[standard],
    inAuditProgram,
    clauseCount,
    applicableCount,
    coveredCount,
    gapCount,
    notApplicableCount,
    ambiguousCount,
    coveragePercent: coveragePercent(coveredCount, applicableCount),
    clauses,
  };
}

// ─── Annex A controls (ISO/IEC 27001:2022) ─────────────────────────────────
//
// Annex A is a second, self-contained requirement set that only ISO 27001 has.
// It is intentionally kept apart from the management-system clause calculation:
// its codes carry an `A.` prefix, and only evidence tokens written in that form
// (`A.5.15`, or a whole theme `A.5`) count towards a control. A bare `5.15`
// token is left to the management-clause path — many bare numbers (`5.2`, `8.1`)
// are valid clauses *and* control numbers, so matching them here would double
// count. See docs/CLAUSE_COVERAGE_BACKLOG.md.

export type AnnexATheme =
  'Organizational' | 'People' | 'Physical' | 'Technological';

interface AnnexAControlNode {
  code: string;
  title: string;
  theme: AnnexATheme;
}

interface AnnexASoaConfig {
  validated: boolean;
  note?: string;
  exclusions: string[];
  justifications: Record<string, string>;
}

const ANNEX_A_CONTROLS = annexAControls as AnnexAControlNode[];
const SOA = annexASoa as AnnexASoaConfig;
const ANNEX_A_THEMES: AnnexATheme[] = [
  'Organizational',
  'People',
  'Physical',
  'Technological',
];
const ANNEX_A_STANDARD: Standard = 'ISMS';
const ANNEX_A_ISO_CODE = 'ISO 27001';
const ANNEX_A_EDITION = '2022';

// Theme sections (A.5 … A.8) are synthetic, title-less parents so that evidence
// mapped to a whole theme rolls down into its child controls — the same
// parent → child behaviour the clause tree already has.
const ANNEX_A_HIERARCHY: StandardHierarchy = buildHierarchy([
  ...ANNEX_A_THEMES.map((_, index) => ({ code: `A.${index + 5}`, title: '' })),
  ...ANNEX_A_CONTROLS.map((control) => ({
    code: control.code,
    title: control.title,
  })),
]);

// ─── Collision-zone codes (management clause ↔ Annex A control) ─────────────
//
// 14 bare codes are simultaneously a valid ISO 27001 management-system clause
// AND an Annex A control number (Annex A spans A.5–A.8 only). When an ISMS
// evidence token is written in the bare form (`8.1`, not `A.8.1`) we cannot
// tell from the workbook whether the reviewer meant clause `8.1` or control
// `A.8.1`. Rather than force a guess, the document is surfaced in BOTH places —
// the management clause and `A.<code>` — and every such ref is flagged
// `ambiguous` so a reviewer can disambiguate in the source workbook.
// See docs/CLAUSE_COVERAGE_BACKLOG.md.
export const COLLISION_ZONE_CODES: ReadonlySet<string> = new Set([
  '5.1',
  '5.2',
  '5.3',
  '6.1',
  '6.2',
  '6.3',
  '7.1',
  '7.2',
  '7.3',
  '7.4',
  '7.5',
  '8.1',
  '8.2',
  '8.3',
]);

const ISMS_CLAUSE_TITLES = new Map(
  (CLAUSE_TREE.ISMS ?? []).map((node) => [node.code, node.title]),
);
const ANNEX_A_TITLES = new Map(
  ANNEX_A_CONTROLS.map((control) => [control.code, control.title]),
);

/** For a bare clause code (`8.1`), the Annex A control it could also mean. */
function annexACounterpartOf(bareCode: string): CoverageCounterpart {
  const code = `A.${bareCode}`;
  return { code, title: ANNEX_A_TITLES.get(code) ?? '' };
}

/** For an Annex A control code (`A.8.1`), the management clause it could also mean. */
function clauseCounterpartOf(controlCode: string): CoverageCounterpart {
  const bare = controlCode.slice(2);
  return { code: bare, title: ISMS_CLAUSE_TITLES.get(bare) ?? '' };
}

/**
 * Bare collision-zone tokens (`8.1`) mirrored onto their Annex A control
 * (`A.8.1`). Kept separate from `evidenceForLeaf` because the token does not
 * canonicalize against the Annex A hierarchy — it is matched against the ISMS
 * *clause* master and then attached to the control as an ambiguous ref.
 */
function annexAAmbiguousEvidence(
  actualEvidence: Evidence[],
  controlCode: string,
): ClauseCoverageEvidenceRef[] {
  const bare = controlCode.slice(2); // `A.8.1` -> `8.1`
  if (!COLLISION_ZONE_CODES.has(bare)) return [];

  const clauseHierarchy = HIERARCHY[ANNEX_A_STANDARD];
  const refs: ClauseCoverageEvidenceRef[] = [];
  for (const evidence of actualEvidence) {
    const carriesBareToken = evidence.standards.some(
      (entry) =>
        entry.standard === ANNEX_A_STANDARD &&
        entry.clauses.some(
          (raw) => canonicalizeClauseToken(raw, clauseHierarchy) === bare,
        ),
    );
    if (!carriesBareToken) continue;

    refs.push(
      evidenceRef(evidence, {
        mappedVia: 'exact',
        mappedClause: bare,
        ambiguous: true,
        counterpart: clauseCounterpartOf(controlCode),
      }),
    );
  }
  return refs;
}

export interface AnnexAControlCoverage {
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
  evidence: ClauseCoverageEvidenceRef[];
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
  controls: AnnexAControlCoverage[];
}

export interface AnnexACoverageSection extends AnnexARollup {
  isoCode: string;
  edition: string;
  inAuditProgram: boolean;
  themes: AnnexAThemeGroup[];
  /** Provenance of the Statement of Applicability used for Not Applicable. */
  soa: {
    validated: boolean;
    note?: string;
  };
}

function isExcludedControl(code: string): boolean {
  return SOA.exclusions.some(
    (excluded) => code === excluded || isStrictAncestor(excluded, code),
  );
}

function annexARollup(controls: AnnexAControlCoverage[]): AnnexARollup {
  const controlCount = controls.length;
  const coveredCount = controls.filter((c) => c.state === 'Covered').length;
  const gapCount = controls.filter((c) => c.state === 'Gap').length;
  const notApplicableCount = controls.filter(
    (c) => c.state === 'Not Applicable',
  ).length;
  const applicableCount = controlCount - notApplicableCount;
  const ambiguousCount = controls.filter((c) => c.ambiguous).length;

  return {
    controlCount,
    applicableCount,
    coveredCount,
    gapCount,
    notApplicableCount,
    ambiguousCount,
    coveragePercent: coveragePercent(coveredCount, applicableCount),
  };
}

function buildAnnexAControl(
  control: AnnexAControlNode,
  actualEvidence: Evidence[],
  inAuditProgram: boolean,
): AnnexAControlCoverage {
  const excluded = isExcludedControl(control.code);
  const applicable = inAuditProgram && !excluded;
  const evidence = applicable
    ? mergeEvidenceRefs(
        evidenceForLeaf(
          actualEvidence,
          ANNEX_A_STANDARD,
          control.code,
          ANNEX_A_HIERARCHY,
        ),
        annexAAmbiguousEvidence(actualEvidence, control.code),
      )
    : [];

  let state: CoverageState;
  if (!applicable) {
    state = 'Not Applicable';
  } else if (evidence.length > 0) {
    state = 'Covered';
  } else {
    state = 'Gap';
  }

  return {
    code: control.code,
    title: control.title,
    theme: control.theme,
    state,
    applicable,
    ambiguous: evidence.some((ref) => ref.ambiguous === true),
    justification: excluded ? SOA.justifications[control.code] : undefined,
    evidence,
  };
}

export function buildAnnexACoverage(
  actualEvidence: Evidence[],
): AnnexACoverageSection {
  const inAuditProgram = SCOPE.program.includes(ANNEX_A_STANDARD);

  const controls = ANNEX_A_CONTROLS.map((control) =>
    buildAnnexAControl(control, actualEvidence, inAuditProgram),
  );

  const themes: AnnexAThemeGroup[] = ANNEX_A_THEMES.map((theme) => {
    const themeControls = controls.filter((c) => c.theme === theme);
    return { theme, ...annexARollup(themeControls), controls: themeControls };
  });

  return {
    isoCode: ANNEX_A_ISO_CODE,
    edition: ANNEX_A_EDITION,
    inAuditProgram,
    ...annexARollup(controls),
    themes,
    soa: { validated: SOA.validated, note: SOA.note },
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
      ambiguous: groups.reduce((sum, group) => sum + group.ambiguousCount, 0),
      coveragePercent: coveragePercent(covered, applicable),
    },
    scope: {
      validated: false,
      note: 'Scope configuration is using placeholder data pending validation.',
    },
    annexA: buildAnnexACoverage(actualEvidence),
  };
}
