import { useMemo, useState } from 'react';
import { ChevronDown, Info, RotateCcw } from 'lucide-react';
import {
  ALL_APPLICABILITY,
  ALL_COVERAGE_STATES,
  ALL_MAPPINGS,
  ALL_THEMES,
  ANNEX_A_THEMES,
  DUAL_MEANING_ONLY,
  type AnnexAApplicabilityFilterValue,
  type AnnexACoverageSection,
  type AnnexAControl,
  type AnnexAThemeFilterValue,
  type AnnexAThemeGroup,
  type CoverageStateFilterValue,
  type MappingFilterValue,
} from '../../types/clauseCoverage';
import { pctLabel, selectClass, type CoverageRowItem } from './clauseCoverageShared';
import { ColumnHeader, CoverageRow } from './clauseCoverageRows';

interface AnnexACoverageViewProps {
  section: AnnexACoverageSection;
}

const controlToRow = (control: AnnexAControl): CoverageRowItem => ({
  code: control.code,
  title: control.title,
  state: control.state,
  evidence: control.evidence,
  notApplicableText: control.justification ?? 'Excluded from the Statement of Applicability',
  ambiguous: control.ambiguous,
});

export function AnnexACoverageView({ section }: AnnexACoverageViewProps) {
  const [theme, setTheme] = useState<AnnexAThemeFilterValue>(ALL_THEMES);
  const [applicability, setApplicability] =
    useState<AnnexAApplicabilityFilterValue>(ALL_APPLICABILITY);
  const [coverageState, setCoverageState] =
    useState<CoverageStateFilterValue>(ALL_COVERAGE_STATES);
  const [mapping, setMapping] = useState<MappingFilterValue>(ALL_MAPPINGS);

  const hasFilters =
    theme !== ALL_THEMES ||
    applicability !== ALL_APPLICABILITY ||
    coverageState !== ALL_COVERAGE_STATES ||
    mapping !== ALL_MAPPINGS;

  function resetFilters() {
    setTheme(ALL_THEMES);
    setApplicability(ALL_APPLICABILITY);
    setCoverageState(ALL_COVERAGE_STATES);
    setMapping(ALL_MAPPINGS);
  }

  const visibleThemes = useMemo(() => {
    const matches = (control: AnnexAControl) => {
      if (applicability === 'Applicable' && !control.applicable) return false;
      if (applicability === 'Not applicable' && control.applicable) return false;
      if (coverageState !== ALL_COVERAGE_STATES && control.state !== coverageState) return false;
      if (mapping === DUAL_MEANING_ONLY && !control.ambiguous) return false;
      return true;
    };

    return section.themes
      .filter((group) => theme === ALL_THEMES || group.theme === theme)
      .map((group) => ({ group, controls: group.controls.filter(matches) }))
      .filter((entry) => entry.controls.length > 0);
  }, [section.themes, theme, applicability, coverageState, mapping]);

  const inView = useMemo(() => {
    const controls = visibleThemes.flatMap((entry) => entry.controls);
    return {
      controls: controls.length,
      covered: controls.filter((c) => c.state === 'Covered').length,
      gaps: controls.filter((c) => c.state === 'Gap').length,
      notApplicable: controls.filter((c) => c.state === 'Not Applicable').length,
    };
  }, [visibleThemes]);

  return (
    <div>
      <div className="overflow-hidden rounded-[10px] border border-border bg-surface shadow-sm">
        {/* ── Filter bar ── */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3.5">
          <label className="flex items-center gap-1.5 text-[11.5px] text-ink-muted">
            <span>Theme</span>
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value as AnnexAThemeFilterValue)}
              className={selectClass(theme !== ALL_THEMES)}
            >
              <option value={ALL_THEMES}>All</option>
              {ANNEX_A_THEMES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-[11.5px] text-ink-muted">
            <span>Applicability</span>
            <select
              value={applicability}
              onChange={(event) =>
                setApplicability(event.target.value as AnnexAApplicabilityFilterValue)
              }
              className={selectClass(applicability !== ALL_APPLICABILITY)}
            >
              <option value={ALL_APPLICABILITY}>All</option>
              <option value="Applicable">Applicable</option>
              <option value="Not applicable">Not applicable</option>
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-[11.5px] text-ink-muted">
            <span>Coverage</span>
            <select
              value={coverageState}
              onChange={(event) => setCoverageState(event.target.value as CoverageStateFilterValue)}
              className={selectClass(coverageState !== ALL_COVERAGE_STATES)}
            >
              <option value={ALL_COVERAGE_STATES}>All</option>
              <option value="Covered">Covered</option>
              <option value="Gap">Gap</option>
              <option value="Not Applicable">Not applicable</option>
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-[11.5px] text-ink-muted">
            <span>Mapping</span>
            <select
              value={mapping}
              onChange={(event) => setMapping(event.target.value as MappingFilterValue)}
              className={selectClass(mapping !== ALL_MAPPINGS)}
              title="Dual meaning — the evidence code is both a management clause and an Annex A control number"
            >
              <option value={ALL_MAPPINGS}>All</option>
              <option value={DUAL_MEANING_ONLY}>
                Dual meaning{section.ambiguousCount > 0 ? ` (${section.ambiguousCount})` : ''}
              </option>
            </select>
          </label>

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex h-7 items-center gap-1 rounded-md border border-border bg-surface px-2.5 text-[12.5px] font-medium text-ink-secondary shadow-sm transition-colors hover:border-noncompliant/30 hover:bg-noncompliant-bg hover:text-noncompliant focus:outline-none"
            >
              <RotateCcw className="h-2.5 w-2.5" aria-hidden="true" />
              Reset
            </button>
          )}
        </div>

        {/* ── Card title ── */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            Annex A controls
            <span className="rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">
              {section.isoCode}:{section.edition}
            </span>
          </span>
          <span className="text-[12px] text-ink-muted">
            <span className="font-semibold text-ink-secondary">{pctLabel(section.coveragePercent)}</span> covered
            <span className="mx-1.5 text-border-strong">·</span>
            <span className="font-mono">
              {section.coveredCount}/{section.applicableCount}
            </span>{' '}
            applicable
          </span>
        </div>

        {/* ── Content ── */}
        {visibleThemes.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mb-1.5 text-[14px] font-semibold text-ink">No controls match your filters</div>
            <p className="mb-4 text-[13px] text-ink-secondary">Try another theme or coverage state.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-md border border-border-strong bg-surface px-4.5 py-2 text-[13px] font-semibold text-ink-secondary hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div>
            {visibleThemes.map((entry) => (
              <ThemeGroup key={entry.group.theme} group={entry.group} controls={entry.controls} />
            ))}
          </div>
        )}

        {/* ── Footer: secondary detail ── */}
        {visibleThemes.length > 0 && (
          <div className="border-t border-border px-4 py-3 text-[12px] text-ink-muted">
            {inView.controls} controls in view · {inView.covered} covered · {inView.gaps} gaps
            {inView.notApplicable > 0 ? ` · ${inView.notApplicable} not applicable` : ''}
          </div>
        )}
      </div>

      <p className="mt-3 text-[12px] leading-5 text-ink-muted">
        Annex A control coverage is calculated by the backend, independent of evidence review and
        compliance outcome. A control is <span className="font-medium text-compliant">Covered</span> when
        it is applicable and has at least one mapped actual document (Accepted, Pending Review or
        Rejected), a <span className="font-medium text-partial">Gap</span> when it is applicable with no
        actual evidence, and <span className="font-medium text-neutral">Not Applicable</span> when the
        Statement of Applicability excludes it. Only evidence whose clause code is written in the{' '}
        <span className="font-mono">A.x.y</span> form (or a whole theme, <span className="font-mono">A.5</span>)
        counts towards a control.
      </p>

      <p className="mt-2 text-[12px] leading-5 text-ink-muted">
        A <span className="font-medium text-accent-hover">Dual meaning</span> tag marks a control whose
        evidence was mapped with a bare code (e.g. <span className="font-mono">8.1</span>) that is also a
        management clause number. The document is shown here <em>and</em> on the Clauses page; confirm
        which was intended and re-map it to <span className="font-mono">A.&lt;code&gt;</span> in the source
        workbook. Use the <span className="font-medium">Mapping</span> filter to review these.
      </p>

      {!section.soa.validated && section.soa.note && (
        <p className="mt-2 flex items-start gap-1.5 text-[11.5px] italic text-ink-muted">
          <Info className="mt-[1px] h-3 w-3 shrink-0" aria-hidden="true" />
          {section.soa.note} Not Applicable counts are provisional until the approved SoA feeds them.
        </p>
      )}
    </div>
  );
}

function ThemeGroup({
  group,
  controls,
}: {
  group: AnnexAThemeGroup;
  controls: AnnexAControl[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 bg-subtle px-3 py-2.5 text-left transition-colors hover:bg-border/60 focus:outline-none"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform duration-150 ${open ? '' : '-rotate-90'}`}
          aria-hidden="true"
        />
        <span className="text-[12.5px] font-semibold text-ink">{group.theme}</span>
        {group.gapCount > 0 && (
          <span className="rounded-[4px] bg-partial-bg px-1.5 py-0.5 text-[11px] font-semibold text-partial">
            {group.gapCount} {group.gapCount === 1 ? 'gap' : 'gaps'}
          </span>
        )}

        <span className="ml-auto flex items-center gap-3 text-[12px]">
          <span className="text-[11.5px] text-ink-secondary">{pctLabel(group.coveragePercent)} covered</span>
          <span className="font-mono text-[11px] text-ink-muted">
            {group.coveredCount}/{group.applicableCount} applicable
          </span>
          {group.notApplicableCount > 0 && (
            <span className="text-[11px] text-ink-muted">{group.notApplicableCount} N/A</span>
          )}
        </span>
      </button>

      {open && (
        <div>
          <ColumnHeader label="Control" />
          {controls.map((control) => (
            <CoverageRow key={control.code} item={controlToRow(control)} />
          ))}
        </div>
      )}
    </div>
  );
}
