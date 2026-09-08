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
