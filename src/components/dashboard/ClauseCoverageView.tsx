import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Download, Info, RotateCcw, Search } from 'lucide-react';
import { ISO_STANDARDS } from '../../data/isoStandards';
import { fetchClauseCoverage } from '../../services/clauseCoverageApi';
import { ALL_ISO, type IsoFilterValue } from '../../types/evidence';
import {
  ALL_COVERAGE_STATES,
  ALL_MAPPINGS,
  DUAL_MEANING_ONLY,
  type ClauseCoverageClause,
  type ClauseCoverageResponse,
  type ClauseCoverageStandardGroup,
  type CoverageStateFilterValue,
  type MappingFilterValue,
} from '../../types/clauseCoverage';
import { pctLabel, selectClass, type CoverageRowItem } from './clauseCoverageShared';
import { ColumnHeader, CoverageRow } from './clauseCoverageRows';
import { AnnexACoverageView } from './AnnexACoverageView';

interface ClauseCoverageViewProps {
  iso: IsoFilterValue;
  onIsoChange: (value: IsoFilterValue) => void;
}

type Section = 'clauses' | 'annexA';

// A management clause rendered as a generic coverage row.
const clauseToRow = (clause: ClauseCoverageClause): CoverageRowItem => ({
  code: clause.clauseCode,
  title: clause.clauseTitle,
  state: clause.state,
  evidence: clause.evidence,
  notApplicableText: 'Outside audit scope',
  ambiguous: clause.ambiguous,
});

export function ClauseCoverageView({ iso, onIsoChange }: ClauseCoverageViewProps) {
  const [data, setData] = useState<ClauseCoverageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<Section>('clauses');
  const [coverageState, setCoverageState] = useState<CoverageStateFilterValue>(ALL_COVERAGE_STATES);
  const [mapping, setMapping] = useState<MappingFilterValue>(ALL_MAPPINGS);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchClauseCoverage()
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load clause coverage.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const query = search.trim().toLowerCase();
  const isGrouped = iso === ALL_ISO;
  const activeStandard = iso !== ALL_ISO ? ISO_STANDARDS.find((std) => std.code === iso) ?? null : null;

  // Standards in the current selection — the authoritative per-standard numbers
  // used for the headline (coverage %, covered / applicable). Row-level filters
  // (state, search) never change these.
  const scopeGroups = useMemo(
    () => (data ? data.groups.filter((group) => iso === ALL_ISO || group.isoCode === iso) : []),
    [data, iso],
  );

  const headline = useMemo(() => {
    const covered = scopeGroups.reduce((sum, g) => sum + g.coveredCount, 0);
    const applicable = scopeGroups.reduce((sum, g) => sum + g.applicableCount, 0);
    const gaps = scopeGroups.reduce((sum, g) => sum + g.gapCount, 0);
    const notApplicable = scopeGroups.reduce((sum, g) => sum + g.notApplicableCount, 0);
    return {
      covered,
      applicable,
      gaps,
      notApplicable,
      standards: scopeGroups.length,
      percent: applicable > 0 ? Math.round((covered / applicable) * 100) : null,
    };
  }, [scopeGroups]);

  // Rows to actually render, after the state / search filters.
  const visibleGroups = useMemo(() => {
    const matchesRow = (clause: ClauseCoverageClause) => {
      if (coverageState !== ALL_COVERAGE_STATES && clause.state !== coverageState) return false;
      if (mapping === DUAL_MEANING_ONLY && !clause.ambiguous) return false;
      if (!query) return true;
      return (
        clause.clauseCode.toLowerCase().includes(query) ||
        clause.clauseTitle.toLowerCase().includes(query) ||
        clause.evidence.some(
          (ev) => ev.evidenceId.toLowerCase().includes(query) || ev.name.toLowerCase().includes(query),
        )
      );
    };

    return scopeGroups
      .map((group) => ({ group, clauses: group.clauses.filter(matchesRow) }))
      .filter((entry) => entry.clauses.length > 0);
  }, [scopeGroups, coverageState, mapping, query]);

  const inView = useMemo(() => {
    const clauses = visibleGroups.flatMap((entry) => entry.clauses);
    return {
      clauses: clauses.length,
      covered: clauses.filter((c) => c.state === 'Covered').length,
      gaps: clauses.filter((c) => c.state === 'Gap').length,
      notApplicable: clauses.filter((c) => c.state === 'Not Applicable').length,
    };
  }, [visibleGroups]);

  const hasFilters =
    coverageState !== ALL_COVERAGE_STATES ||
    mapping !== ALL_MAPPINGS ||
    query.length > 0 ||
    iso !== ALL_ISO;

  // Dual-meaning clauses across the standards currently in scope.
  const ambiguousInScope = useMemo(
    () => scopeGroups.reduce((sum, group) => sum + group.ambiguousCount, 0),
    [scopeGroups],
  );

  function resetFilters() {
    setCoverageState(ALL_COVERAGE_STATES);
    setMapping(ALL_MAPPINGS);
    setSearch('');
    onIsoChange(ALL_ISO);
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold text-ink">Clause coverage</h2>
          {section === 'clauses' ? (
            <p className="mt-0.5 text-[12.5px] text-ink-secondary">
              {activeStandard
                ? `${activeStandard.code} · ${activeStandard.shortName} — ${pctLabel(headline.percent)} covered · ${headline.covered}/${headline.applicable} applicable clauses · ${headline.gaps} gaps`
                : `All standards · ${headline.standards} management systems — ${pctLabel(headline.percent)} covered · ${headline.covered}/${headline.applicable} applicable clauses · ${headline.gaps} gaps`}
            </p>
          ) : (
            data && (
              <p className="mt-0.5 text-[12.5px] text-ink-secondary">
                ISO 27001:2022 · Information Security — {pctLabel(data.annexA.coveragePercent)} covered ·{' '}
                {data.annexA.coveredCount}/{data.annexA.applicableCount} applicable controls ·{' '}
                {data.annexA.gapCount} gaps
              </p>
            )
          )}
        </div>
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[12.5px] font-medium text-ink-secondary shadow-sm transition-colors hover:border-border-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Download className="h-3 w-3" aria-hidden="true" />
          Export
        </button>
      </div>

      <SectionToggle section={section} onChange={setSection} />

      {section === 'annexA' ? (
        error ? (
          <div className="rounded-[10px] border border-noncompliant/30 bg-noncompliant-bg p-4 text-[13px] text-noncompliant">
            {error}
          </div>
        ) : !data ? (
          <div className="rounded-[10px] border border-border bg-surface p-8 text-center text-[13px] text-ink-secondary shadow-sm">
            Loading Annex A coverage…
          </div>
        ) : (
          <AnnexACoverageView section={data.annexA} />
        )
      ) : (
        <>
          <div className="overflow-hidden rounded-[10px] border border-border bg-surface shadow-sm">
            {/* ── Filter bar ── */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3.5">
              <label className="relative flex items-center">
                <Search
                  className="pointer-events-none absolute left-2 h-3 w-3 text-ink-muted"
                  aria-hidden="true"
                />
                <span className="sr-only">Search clauses</span>
                <input
                  type="search"
                  placeholder="Search clauses…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={`h-7 w-52 rounded-md border pl-7 pr-2.5 text-[12.5px] transition-colors focus:outline-none focus:ring-1 focus:ring-accent ${
                    search
                      ? 'border-accent bg-accent-tint text-accent-hover placeholder:text-accent-hover/60'
                      : 'border-border bg-surface text-ink-secondary placeholder:text-ink-muted hover:border-border-strong'
                  }`}
                />
              </label>

              <label className="flex items-center gap-1.5 text-[11.5px] text-ink-muted">
                <span>Standard</span>
                <select
                  value={iso}
                  onChange={(event) => onIsoChange(event.target.value as IsoFilterValue)}
                  className={selectClass(iso !== ALL_ISO)}
                >
                  <option value={ALL_ISO}>All</option>
                  {ISO_STANDARDS.map((std) => (
                    <option key={std.code} value={std.code}>
                      {std.code} · {std.shortName}
                    </option>
                  ))}
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
                    Dual meaning{ambiguousInScope > 0 ? ` (${ambiguousInScope})` : ''}
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
                Clauses 4–10
                <span className="rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">
                  {activeStandard ? activeStandard.code : 'All standards'}
                </span>
              </span>
              {data && (
                <span className="text-[12px] text-ink-muted">
                  <span className="font-semibold text-ink-secondary">{pctLabel(headline.percent)}</span> covered
                  <span className="mx-1.5 text-border-strong">·</span>
                  <span className="font-mono">{headline.covered}/{headline.applicable}</span> applicable
                </span>
              )}
            </div>

            {/* ── Content ── */}
            {error ? (
              <div className="px-4 py-10 text-center text-[13px] text-noncompliant">{error}</div>
            ) : !data ? (
              <div className="px-4 py-10 text-center text-[13px] text-ink-secondary">Loading clause coverage…</div>
            ) : visibleGroups.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="mb-1.5 text-[14px] font-semibold text-ink">No clauses match your filters</div>
                <p className="mb-4 text-[13px] text-ink-secondary">Try another standard or coverage state.</p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-md border border-border-strong bg-surface px-4.5 py-2 text-[13px] font-semibold text-ink-secondary hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Reset filters
                </button>
              </div>
            ) : isGrouped ? (
              <div>
                {visibleGroups.map((entry) => (
                  <CoverageGroup key={entry.group.isoCode} group={entry.group} clauses={entry.clauses} />
                ))}
              </div>
            ) : (
              <div>
                <ColumnHeader label="Clause" />
                {visibleGroups[0]?.clauses.map((clause) => (
                  <CoverageRow key={clause.clauseCode} item={clauseToRow(clause)} />
                ))}
              </div>
            )}

            {/* ── Footer: secondary detail ── */}
            {data && visibleGroups.length > 0 && (
              <div className="border-t border-border px-4 py-3 text-[12px] text-ink-muted">
                {inView.clauses} clauses in view · {inView.covered} covered · {inView.gaps} gaps
                {inView.notApplicable > 0 ? ` · ${inView.notApplicable} not applicable` : ''}
              </div>
            )}
          </div>

          <p className="mt-3 text-[12px] leading-5 text-ink-muted">
            Coverage is calculated by the backend and is independent of evidence review and compliance
            outcome. A clause is <span className="font-medium text-compliant">Covered</span> when it is in
            scope and has at least one mapped actual document (Accepted, Pending Review or Rejected — a{' '}
            <span className="font-medium">Missing</span> record does not count), a{' '}
            <span className="font-medium text-partial">Gap</span> when it is in scope with no actual
            evidence, and <span className="font-medium text-neutral">Not Applicable</span> when it sits
            outside the audit scope. Evidence mapped to a parent clause counts towards its child clauses.
          </p>

          <p className="mt-2 text-[12px] leading-5 text-ink-muted">
            A <span className="font-medium text-accent-hover">Dual meaning</span> tag marks a clause whose
            evidence code (e.g. <span className="font-mono">8.1</span>) is also an Annex A control number
            (<span className="font-mono">A.8.1</span>). The document is listed on both this page and the
            Annex A page; a reviewer should re-map it to <span className="font-mono">A.&lt;code&gt;</span> in
            the source workbook if the control was what was intended. Use the <span className="font-medium">Mapping</span>{' '}
            filter to review these.
          </p>

          {data && !data.scope.validated && data.scope.note && (
            <p className="mt-2 flex items-start gap-1.5 text-[11.5px] italic text-ink-muted">
              <Info className="mt-[1px] h-3 w-3 shrink-0" aria-hidden="true" />
              {data.scope.note} Not Applicable counts are provisional, not a validated Statement of
              Applicability.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Section sub-navigation ────────────────────────────────────────────────

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'clauses', label: 'Clauses 4–10' },
  { id: 'annexA', label: 'Annex A controls' },
];

function SectionToggle({
  section,
  onChange,
}: {
  section: Section;
  onChange: (value: Section) => void;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Section</span>
      <div className="inline-flex rounded-md border border-border bg-surface p-0.5 shadow-sm">
        {SECTIONS.map((entry) => {
          const active = section === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onChange(entry.id)}
              aria-pressed={active}
              className={`rounded-[5px] px-3 py-1 text-[12.5px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                active
                  ? 'bg-accent-tint text-accent-hover'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              {entry.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Grouped (all standards) ───────────────────────────────────────────────

function CoverageGroup({
  group,
  clauses,
}: {
  group: ClauseCoverageStandardGroup;
  clauses: ClauseCoverageClause[];
}) {
  const [open, setOpen] = useState(false);
  const shortName = ISO_STANDARDS.find((std) => std.code === group.isoCode)?.shortName ?? group.standard;

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
        <span className="font-mono text-[12.5px] font-semibold text-ink">{group.isoCode}</span>
        <span className="hidden text-[12.5px] text-ink-muted sm:inline">{shortName}</span>
        {!group.inAuditProgram && (
          <span className="rounded-full bg-neutral-bg px-2 py-0.5 text-[11px] font-semibold text-neutral">
            Out of scope
          </span>
        )}
        {/* Gap count — the actionable metric, shown once, next to the standard. Hidden when fully covered. */}
        {group.gapCount > 0 && (
          <span className="rounded-[4px] bg-partial-bg px-1.5 py-0.5 text-[11px] font-semibold text-partial">
            {group.gapCount} {group.gapCount === 1 ? 'gap' : 'gaps'}
          </span>
        )}

        {/* Right side: supporting context only */}
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
          <ColumnHeader label="Clause" />
          {clauses.map((clause) => (
            <CoverageRow key={clause.clauseCode} item={clauseToRow(clause)} />
          ))}
        </div>
      )}
    </div>
  );
}
