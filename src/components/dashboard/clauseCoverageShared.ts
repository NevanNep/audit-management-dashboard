import type { CoverageEvidenceRef, CoverageState } from '../../types/clauseCoverage';

// Filter <select> styling — active (a filter is set) vs resting.
export const selectClass = (active: boolean) =>
  `h-7 rounded-md border px-2 text-[12.5px] transition-colors focus:outline-none focus:ring-1 focus:ring-accent ${
    active
      ? 'border-accent bg-accent-tint font-medium text-accent-hover'
      : 'border-border bg-surface text-ink-secondary hover:border-border-strong'
  }`;

// Coverage state → the visual language already used for compliance/evidence.
export const STATE_STYLE: Record<
  CoverageState,
  { mark: string; text: string; row: string }
> = {
  Covered: { mark: 'bg-compliant', text: 'text-compliant', row: '' },
  Gap: { mark: 'bg-partial', text: 'text-partial', row: 'bg-partial-bg/35' },
  'Not Applicable': {
    mark: 'border-[1.5px] border-neutral',
    text: 'text-neutral',
    row: 'bg-subtle/40',
  },
};

export const pctLabel = (percent: number | null) =>
  percent === null ? '—' : `${percent}%`;

// ─── Shared table layout ───────────────────────────────────────────────────

export const COL_CHEVRON = 'w-7 shrink-0';
export const COL_CLAUSE = 'w-[340px] shrink-0 px-2.5';
export const COL_COVERAGE = 'w-[130px] shrink-0 px-2.5';
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
