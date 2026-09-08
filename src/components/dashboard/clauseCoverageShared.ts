import type { CoverageEvidenceRef, CoverageState } from '../../types/clauseCoverage';

// Filter <select> styling — active (a filter is set) vs resting.
export const selectClass = (active: boolean) =>
  `h-7 rounded-md border px-2 text-[12.5px] transition-colors focus:outline-none focus:ring-1 focus:ring-accent ${
    active
      ? 'border-accent bg-accent-tint font-medium text-accent-hover'
      : 'border-border bg-surface text-ink-secondary hover:border-border-strong'
  }`;

// Coverage state → the visual language already used for compliance/evidence.
// `mark` styles the 8px square; 'Covered (needs work)' instead renders a warning
// icon (see clauseCoverageRows), so its `mark` is only a fallback tint.
export const STATE_STYLE: Record<
  CoverageState,
  { mark: string; text: string; row: string }
> = {
  Covered: { mark: 'bg-compliant', text: 'text-compliant', row: '' },
  'Covered (needs work)': {
    mark: 'bg-needs-work',
    text: 'text-needs-work',
    row: 'bg-needs-work-bg/40',
  },
  Gap: { mark: 'bg-partial', text: 'text-partial', row: 'bg-partial-bg/35' },
  'Not Applicable': {
    mark: 'border-[1.5px] border-neutral',
    text: 'text-neutral',
    row: 'bg-subtle/40',
  },
};

// Row-level coverage state → short label shown in the Coverage column and used
// as the <select> option label.
export const COVERAGE_STATE_LABEL: Record<CoverageState, string> = {
  Covered: 'Covered',
  'Covered (needs work)': 'Covered · needs work',
  Gap: 'Gap',
  'Not Applicable': 'Not applicable',
};

export const pctLabel = (percent: number | null) =>
  percent === null ? '—' : `${percent}%`;

// ─── Breadth of coverage ───────────────────────────────────────────────────
// An inherited row got its evidence from an ancestor mapping. "Breadth" says how
// wide that ancestor is: the ratio of sibling requirements the one mapping
// stands in for, out of every requirement under that ancestor. Purely
// informational — no threshold, no colour escalation anywhere.

/** Dot-separated clause/control code → its segments (`A.8.5` → `['A','8','5']`). */
const segmentsOf = (code: string) => code.split('.');

/**
 * True when `ancestor` sits strictly above `descendant` in the code tree — its
 * segments are a proper leading subsequence of the descendant's (`A.8` → `A.8.5`,
 * `6` → `6.1.2`). Mirrors the backend's hierarchy check: NOT a string prefix
 * test, so `6` does not match `60` and `A.8` does not match `A.80`.
 */
export function isStrictAncestorCode(ancestor: string, descendant: string): boolean {
  const a = segmentsOf(ancestor);
  const d = segmentsOf(descendant);
  if (a.length >= d.length) return false;
  return a.every((segment, index) => segment === d[index]);
}

/**
 * True when `code` is a theme / top-level root — the widest level a mapping can
 * sit at: an Annex A theme (`A.5`…`A.8`) or a bare top-level management clause
 * number (`6`, `7`). An intermediate node (`A.8.5`, `6.1`) is not a root. This is
 * a structural fact about the code, never a count threshold.
 */
export function isRootLevelMapping(code: string): boolean {
  return /^A\.\d+$/.test(code) || /^\d+$/.test(code);
}

export interface BreadthInfo {
  /** The ancestor code the evidence is actually mapped to (`A.8`, `6.1`). */
  via: string;
  /** Sibling requirements under `via` this one mapping reaches. */
  covered: number;
  /** Total requirements under `via` in this group (in scope or not). */
  total: number;
  /** Noun for the counts — matches the page. */
  unit: 'controls' | 'clauses';
  /** Mapped at the widest possible level (a theme / top-level clause root). */
  broad: boolean;
}

/** One requirement's code and its mapped evidence — the input to a breadth lookup. */
export interface BreadthLeaf {
  code: string;
  evidence: CoverageEvidenceRef[];
}

/**
 * Build a per-group breadth lookup. `leaves` must be the group's FULL,
 * pre-filter requirement list so the denominator is stable regardless of the
 * active row filters. Returns `null` for direct (non-inherited) refs and for
 * ancestors with no descendants in this group.
 */
export function makeBreadthLookup(
  leaves: BreadthLeaf[],
  unit: 'controls' | 'clauses',
): (ref: CoverageEvidenceRef) => BreadthInfo | null {
  const codes = leaves.map((leaf) => leaf.code);
  // evidenceId → the set of requirement codes it reaches anywhere in the group.
  const reach = new Map<string, Set<string>>();
  for (const leaf of leaves) {
    for (const ref of leaf.evidence) {
      let set = reach.get(ref.evidenceId);
      if (!set) reach.set(ref.evidenceId, (set = new Set()));
      set.add(leaf.code);
    }
  }

  return (ref) => {
    if (ref.mappedVia !== 'parent') return null;
    const via = ref.mappedClause;
    const descendants = codes.filter((code) => isStrictAncestorCode(via, code));
    if (descendants.length === 0) return null;
    const reached = reach.get(ref.evidenceId);
    const covered = reached
      ? descendants.filter((code) => reached.has(code)).length
      : 0;
    return { via, covered, total: descendants.length, unit, broad: isRootLevelMapping(via) };
  };
}

/** A row's breadth for sorting — the widest ancestor any of its evidence uses.
 *  Rows with no inherited mapping return -1 so they sort to the bottom. */
export function rowBreadthRank(
  evidence: CoverageEvidenceRef[],
  breadthOf: (ref: CoverageEvidenceRef) => BreadthInfo | null,
): number {
  let best = -1;
  for (const ref of evidence) {
    const info = breadthOf(ref);
    if (info && info.total > best) best = info.total;
  }
  return best;
}

// ─── Shared table layout ───────────────────────────────────────────────────

export const COL_CHEVRON = 'w-7 shrink-0';
export const COL_CLAUSE = 'w-[340px] shrink-0 px-2.5';
// Wide enough for the "Covered · needs work" label + icon on one line.
export const COL_COVERAGE = 'w-[164px] shrink-0 px-2.5';
export const COL_EVIDENCE = 'min-w-0 flex-1 px-2.5';

/** One requirement row — a management clause or an Annex A control. */
export interface CoverageRowItem {
  code: string;
  title: string;
  state: CoverageState;
  evidence: CoverageEvidenceRef[];
  /** Text shown in the evidence column when the row is Not Applicable. */
  notApplicableText: string;
  /** The row has a collision-zone mapping — also listed on the other page. */
  ambiguous?: boolean;
}
