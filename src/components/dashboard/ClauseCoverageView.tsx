import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Download, ExternalLink, Info, RotateCcw, Search } from 'lucide-react';
import { ComplianceResultBadge, EvidenceStatusBadge } from '../ui/StatusBadge';
import { ISO_STANDARDS } from '../../data/isoStandards';
import { fetchClauseCoverage } from '../../services/clauseCoverageApi';
import { ALL_ISO, type IsoFilterValue } from '../../types/evidence';
import {
  ALL_COVERAGE_STATES,
  type ClauseCoverageClause,
  type ClauseCoverageResponse,
  type ClauseCoverageStandardGroup,
  type CoverageState,
  type CoverageStateFilterValue,
} from '../../types/clauseCoverage';

interface ClauseCoverageViewProps {
  iso: IsoFilterValue;
  onIsoChange: (value: IsoFilterValue) => void;
}

const selectClass = (active: boolean) =>
  `h-7 rounded-md border px-2 text-[12.5px] transition-colors focus:outline-none focus:ring-1 focus:ring-accent ${
    active
      ? 'border-accent bg-accent-tint font-medium text-accent-hover'
      : 'border-border bg-surface text-ink-secondary hover:border-border-strong'
  }`;

// Coverage state → the visual language already used for compliance/evidence.
const STATE_STYLE: Record<CoverageState, { mark: string; text: string; row: string }> = {
  Covered: { mark: 'bg-compliant', text: 'text-compliant', row: '' },
  Gap: { mark: 'bg-partial', text: 'text-partial', row: 'bg-partial-bg/35' },
  'Not Applicable': { mark: 'border-[1.5px] border-neutral', text: 'text-neutral', row: 'bg-subtle/40' },
};

const pctLabel = (percent: number | null) => (percent === null ? '—' : `${percent}%`);

export function ClauseCoverageView({ iso, onIsoChange }: ClauseCoverageViewProps) {
  const [data, setData] = useState<ClauseCoverageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverageState, setCoverageState] = useState<CoverageStateFilterValue>(ALL_COVERAGE_STATES);
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
  }, [scopeGroups, coverageState, query]);

  const inView = useMemo(() => {
    const clauses = visibleGroups.flatMap((entry) => entry.clauses);
    return {
      clauses: clauses.length,
      covered: clauses.filter((c) => c.state === 'Covered').length,
      gaps: clauses.filter((c) => c.state === 'Gap').length,
      notApplicable: clauses.filter((c) => c.state === 'Not Applicable').length,
    };
  }, [visibleGroups]);

  const hasFilters = coverageState !== ALL_COVERAGE_STATES || query.length > 0 || iso !== ALL_ISO;

  function resetFilters() {
    setCoverageState(ALL_COVERAGE_STATES);
    setSearch('');
    onIsoChange(ALL_ISO);
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold text-ink">Clause coverage</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-secondary">
            {activeStandard
              ? `${activeStandard.code} · ${activeStandard.shortName} — ${pctLabel(headline.percent)} covered · ${headline.covered}/${headline.applicable} applicable clauses · ${headline.gaps} gaps`
              : `All standards · ${headline.standards} management systems — ${pctLabel(headline.percent)} covered · ${headline.covered}/${headline.applicable} applicable clauses · ${headline.gaps} gaps`}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[12.5px] font-medium text-ink-secondary shadow-sm transition-colors hover:border-border-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Download className="h-3 w-3" aria-hidden="true" />
          Export
        </button>
      </div>

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
            Clause coverage
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
            <ColumnHeader />
            {visibleGroups[0]?.clauses.map((clause) => (
              <CoverageRow key={clause.clauseCode} clause={clause} />
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

      {data && !data.scope.validated && data.scope.note && (
        <p className="mt-2 flex items-start gap-1.5 text-[11.5px] italic text-ink-muted">
          <Info className="mt-[1px] h-3 w-3 shrink-0" aria-hidden="true" />
          {data.scope.note} Not Applicable counts are provisional, not a validated Statement of
          Applicability.
        </p>
      )}
    </div>
  );
}

// ─── Grouped (all standards) ────────────────────────────────────────────────

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

        {/* Primary metric: coverage % + covered / applicable */}
        <span className="ml-auto flex items-center gap-2 text-[12px]">
          <span className="font-semibold text-ink">{pctLabel(group.coveragePercent)} covered</span>
          <span className="font-mono text-[11.5px] text-ink-muted">
            {group.coveredCount}/{group.applicableCount} applicable
          </span>
          {/* Secondary: gaps + N/A */}
          {group.gapCount > 0 && (
            <span className="text-[11.5px] font-medium text-partial">{group.gapCount} gaps</span>
          )}
          {group.notApplicableCount > 0 && (
            <span className="text-[11px] text-ink-muted">{group.notApplicableCount} N/A</span>
          )}
        </span>
      </button>

      {open && (
        <div>
          <ColumnHeader />
          {clauses.map((clause) => (
            <CoverageRow key={clause.clauseCode} clause={clause} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared table pieces ───────────────────────────────────────────────────

const COL_CHEVRON = 'w-7 shrink-0';
const COL_CLAUSE = 'w-[340px] shrink-0 px-2.5';
const COL_COVERAGE = 'w-[130px] shrink-0 px-2.5';
const COL_EVIDENCE = 'min-w-0 flex-1 px-2.5';

function ColumnHeader() {
  return (
    <div className="flex items-center border-b border-border bg-subtle/60 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
      <div className={COL_CHEVRON} />
      <div className={COL_CLAUSE}>Clause</div>
      <div className={COL_COVERAGE}>Coverage</div>
      <div className={COL_EVIDENCE}>Mapped evidence</div>
    </div>
  );
}

function CoverageRow({ clause }: { clause: ClauseCoverageClause }) {
  const [open, setOpen] = useState(false);
  const style = STATE_STYLE[clause.state];
  const expandable = clause.evidence.length > 1;
  const label = clause.state === 'Not Applicable' ? 'Not applicable' : clause.state;

  return (
    <div className={`border-b border-border last:border-b-0 ${style.row}`}>
      <div className="flex items-start py-2.5">
        <div className={`${COL_CHEVRON} flex items-center justify-center pt-0.5`}>
          {expandable && (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label={open ? 'Collapse mapped evidence' : 'Expand mapped evidence'}
              className="flex h-5 w-5 items-center justify-center rounded text-ink-muted transition-colors hover:bg-border hover:text-ink-secondary focus:outline-none"
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-150 ${open ? '' : '-rotate-90'}`}
                aria-hidden="true"
              />
            </button>
          )}
        </div>

        <div className={`${COL_CLAUSE} flex items-baseline gap-2`}>
          <span className="shrink-0 font-mono text-[12px] font-medium text-clause-code">{clause.clauseCode}</span>
          <span className={`text-[12.5px] ${clause.state === 'Not Applicable' ? 'text-ink-secondary' : 'text-ink'}`}>
            {clause.clauseTitle}
          </span>
        </div>

        <div className={`${COL_COVERAGE} flex items-center gap-[7px] pt-0.5`}>
          <span className={`h-2 w-2 shrink-0 rounded-[2px] ${style.mark}`} aria-hidden="true" />
          <span className={`text-[12.5px] font-medium ${style.text}`}>{label}</span>
        </div>

        <div className={COL_EVIDENCE}>
          {clause.state === 'Not Applicable' ? (
            <span className="text-[12px] italic text-neutral">Outside audit scope</span>
          ) : clause.evidence.length === 0 ? (
            <span className="text-[12px] italic text-neutral">No evidence mapped</span>
          ) : expandable && !open ? (
            <span className="inline-flex items-center gap-2 text-[12px] text-ink-muted">
              <span className="rounded-full bg-subtle px-2 py-0.5 font-mono text-[10.5px] font-medium text-ink-secondary">
                {clause.evidence.length}
              </span>
              documents mapped
            </span>
          ) : (
            <div className="flex flex-col gap-1">
              {clause.evidence.map((ev) => (
                <EvidenceLine key={ev.evidenceId} ev={ev} clauseCode={clause.clauseCode} detailed={expandable} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EvidenceLine({
  ev,
  clauseCode,
  detailed,
}: {
  ev: ClauseCoverageClause['evidence'][number];
  clauseCode: string;
  detailed: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-[4px] bg-subtle px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-ink-secondary">
        {ev.evidenceId}
      </span>
      <span className="text-[12px] text-ink-muted">{ev.name}</span>
      {ev.mappedVia === 'parent' && (
        <span
          className="rounded-[4px] bg-subtle px-1.5 py-0.5 font-mono text-[10px] text-ink-muted"
          title={`Mapped to parent clause ${ev.mappedClause}, inherited by ${clauseCode}`}
        >
          via {ev.mappedClause}
        </span>
      )}
      {detailed && (
        <>
          <EvidenceStatusBadge status={ev.evidenceStatus} />
          <ComplianceResultBadge result={ev.complianceResult} />
          {ev.documentUrl && (
            <a
              href={ev.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-link hover:text-accent-hover hover:underline focus:outline-none"
            >
              Open
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </>
      )}
    </div>
  );
}
