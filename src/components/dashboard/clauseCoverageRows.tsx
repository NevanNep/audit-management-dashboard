import { useState } from 'react';
import { ArrowLeftRight, ChevronDown, ExternalLink } from 'lucide-react';
import { ComplianceResultBadge, EvidenceStatusBadge } from '../ui/StatusBadge';
import type { CoverageEvidenceRef } from '../../types/clauseCoverage';
import {
  COL_CHEVRON,
  COL_CLAUSE,
  COL_COVERAGE,
  COL_EVIDENCE,
  STATE_STYLE,
  type CoverageRowItem,
} from './clauseCoverageShared';

export function ColumnHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center border-b border-border bg-subtle/60 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
      <div className={COL_CHEVRON} />
      <div className={COL_CLAUSE}>{label}</div>
      <div className={COL_COVERAGE}>Coverage</div>
      <div className={COL_EVIDENCE}>Mapped evidence</div>
    </div>
  );
}

export function CoverageRow({ item }: { item: CoverageRowItem }) {
  const [open, setOpen] = useState(false);
  const style = STATE_STYLE[item.state];
  const expandable = item.evidence.length > 1;
  const label = item.state === 'Not Applicable' ? 'Not applicable' : item.state;

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

        <div className={`${COL_CLAUSE} flex flex-wrap items-baseline gap-x-2 gap-y-1`}>
          <span className="shrink-0 font-mono text-[12px] font-medium text-clause-code">{item.code}</span>
          <span className={`text-[12.5px] ${item.state === 'Not Applicable' ? 'text-ink-secondary' : 'text-ink'}`}>
            {item.title}
          </span>
          {item.ambiguous && (
            <span
              className="inline-flex shrink-0 items-center gap-1 self-center rounded-[4px] border border-accent/40 bg-accent-tint px-1.5 py-0.5 text-[10px] font-semibold text-accent-hover"
              title="Dual meaning: the evidence code is both a management clause and an Annex A control number. The same document is listed on both pages — confirm which was intended."
            >
              <ArrowLeftRight className="h-2.5 w-2.5" aria-hidden="true" />
              Dual meaning
            </span>
          )}
        </div>

        <div className={`${COL_COVERAGE} flex items-center gap-[7px] pt-0.5`}>
          <span className={`h-2 w-2 shrink-0 rounded-[2px] ${style.mark}`} aria-hidden="true" />
          <span className={`text-[12.5px] font-medium ${style.text}`}>{label}</span>
        </div>

        <div className={COL_EVIDENCE}>
          {item.state === 'Not Applicable' ? (
            <span className="text-[12px] italic text-neutral">{item.notApplicableText}</span>
          ) : item.evidence.length === 0 ? (
            <span className="text-[12px] italic text-neutral">No evidence mapped</span>
          ) : expandable && !open ? (
            <span className="inline-flex items-center gap-2 text-[12px] text-ink-muted">
              <span className="rounded-full bg-subtle px-2 py-0.5 font-mono text-[10.5px] font-medium text-ink-secondary">
                {item.evidence.length}
              </span>
              documents mapped
            </span>
          ) : (
            <div className="flex flex-col gap-1">
              {item.evidence.map((ev) => (
                <EvidenceLine key={ev.evidenceId} ev={ev} rowCode={item.code} detailed={expandable} />
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
  rowCode,
  detailed,
}: {
  ev: CoverageEvidenceRef;
  rowCode: string;
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
          title={`Mapped to ${ev.mappedClause}, inherited by ${rowCode}`}
        >
          via {ev.mappedClause}
        </span>
      )}
      {ev.ambiguous && ev.counterpart && (
        <span
          className="inline-flex items-center gap-1 rounded-[4px] border border-accent/40 bg-accent-tint px-1.5 py-0.5 text-[10px] font-medium text-accent-hover"
          title={`Token "${ev.mappedClause}" could also mean ${ev.counterpart.code}${
            ev.counterpart.title ? ` ${ev.counterpart.title}` : ''
          }. This document is also listed there — confirm which was intended.`}
        >
          <ArrowLeftRight className="h-2.5 w-2.5" aria-hidden="true" />
          also <span className="font-mono">{ev.counterpart.code}</span>
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
