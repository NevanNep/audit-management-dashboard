import {
  ComplianceResultValue,
  Evidence,
  Standard,
  STANDARDS_VALUES,
} from './evidence.types';
import { isOverdue } from './evidence-query.util';
import {
  buildClauseCoverage,
  ClauseCoverageClause,
  ClauseCoverageEvidenceRef,
} from './clause-coverage.util';
import type { AnnexAControlCoverage } from './clause-coverage.util';

/**
 * "Needs Attention" is a pure read-only aggregation view. It introduces **no**
 * new status, risk score or persisted state — it only re-surfaces three signals
 * that are already computed elsewhere in the dashboard and merges them into one
 * queue:
 *
 *   - `overdue`  — evidence past its due date. Uses the exact same `isOverdue`
 *                  helper that powers the Evidence Documents "overdue only"
 *                  filter and the sidebar "N overdue" stat.
 *   - `rejected` — evidence whose Evidence Status is `Rejected` (the same filter
 *                  value the Evidence Documents page already exposes).
 *   - `needsWork`— in-scope clauses/controls whose coverage state is
 *                  `Covered (needs work)` (their only mapped evidence is
 *                  Rejected), straight out of `buildClauseCoverage`.
 *
 * Overlap rule: a document that is BOTH overdue AND rejected is surfaced once in
 * the overdue queue and once in the rejected queue — the two are worked as
 * separate queues, so each must show the full picture. It is never double
 * counted *within* a single category. This is asserted by the unit tests.
 */

export type NeedsAttentionReason = 'overdue' | 'rejected' | 'needsWork';

interface NeedsAttentionItemBase {
  reason: NeedsAttentionReason;
  /** Stable, unique key across the merged list (for React rendering). */
  key: string;
  /** Standards this item belongs to — used by the Standard filter. */
  standards: Standard[];
  /** Clause / control codes shown in the Clause column. */
  clauseCodes: string[];
  /** External URL of the document that has to be fixed, when one exists. */
  documentUrl?: string;
}

export interface OverdueAttentionItem extends NeedsAttentionItemBase {
  reason: 'overdue';
  evidenceId: string;
  name: string;
  dueDate: string;
  daysOverdue: number;
}

export interface RejectedAttentionItem extends NeedsAttentionItemBase {
  reason: 'rejected';
  evidenceId: string;
  name: string;
  /**
   * The evidence's existing Compliance Result — the ONLY reason detail
   * available. There is no free-text rejection reason in the data source and
   * none is fabricated. `null` when the field is empty/unknown.
   */
  complianceResult: ComplianceResultValue | null;
}

export interface NeedsWorkAttentionItem extends NeedsAttentionItemBase {
  reason: 'needsWork';
  standard: Standard;
  /** Which Clause Coverage sub-page the clause/control lives on. */
  section: 'clauses' | 'annexA';
  clauseCode: string;
  clauseTitle: string;
  /** The rejected document id(s) that are this clause's only mapped evidence. */
  rejectedEvidenceIds: string[];
}

export type NeedsAttentionItem =
  OverdueAttentionItem | RejectedAttentionItem | NeedsWorkAttentionItem;

export interface NeedsAttentionResponse {
  items: NeedsAttentionItem[];
  totals: {
    overdue: number;
    rejected: number;
    needsWork: number;
    total: number;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fixed queue order: overdue first, then rejected, then needs-work. */
const REASON_ORDER: Record<NeedsAttentionReason, number> = {
  overdue: 0,
  rejected: 1,
  needsWork: 2,
};

/**
 * Rejected rows have no rejection date to sort by, so "urgency" falls back to
 * the severity of the Compliance Result the auditor recorded.
 */
const COMPLIANCE_SEVERITY: Record<string, number> = {
  'Non-compliant': 0,
  'Partially compliant': 1,
  'Not assessed': 2,
  Compliant: 3,
};

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

/** `"9.2 Internal audit"` -> `"9.2"`; leaves clean codes (`"A.5.15"`) untouched. */
function cleanClauseCode(raw: string): string {
  return raw.trim().split(/\s+/)[0] ?? raw.trim();
}

function evidenceStandards(evidence: Evidence): Standard[] {
  return [...new Set(evidence.standards.map((entry) => entry.standard))];
}

function evidenceClauseCodes(evidence: Evidence): string[] {
  return [
    ...new Set(
      evidence.standards.flatMap((entry) =>
        entry.clauses.map(cleanClauseCode).filter((code) => code.length > 0),
      ),
    ),
  ];
}

function firstDocumentUrl(
  refs: readonly ClauseCoverageEvidenceRef[],
): string | undefined {
  return refs.find((ref) => !!ref.documentUrl)?.documentUrl || undefined;
}

function buildOverdueItems(
  all: Evidence[],
  referenceDate: Date,
): OverdueAttentionItem[] {
  return all
    .filter((evidence) => isOverdue(evidence.dueDate, referenceDate))
    .map((evidence) => ({
      reason: 'overdue' as const,
      key: `overdue:${evidence.evidenceId}`,
      standards: evidenceStandards(evidence),
      clauseCodes: evidenceClauseCodes(evidence),
      documentUrl: evidence.documentUrl || undefined,
      evidenceId: evidence.evidenceId,
      name: evidence.documentEvidence,
      dueDate: evidence.dueDate as string,
      daysOverdue: daysBetween(
        new Date(evidence.dueDate as string),
        referenceDate,
      ),
    }))
    .sort(
      (a, b) =>
        b.daysOverdue - a.daysOverdue ||
        a.evidenceId.localeCompare(b.evidenceId),
    );
}

function buildRejectedItems(all: Evidence[]): RejectedAttentionItem[] {
  return all
    .filter((evidence) => evidence.evidenceStatus === 'Rejected')
    .map((evidence) => {
      const complianceResult = (evidence.complianceResult ||
        null) as ComplianceResultValue | null;
      return {
        reason: 'rejected' as const,
        key: `rejected:${evidence.evidenceId}`,
        standards: evidenceStandards(evidence),
        clauseCodes: evidenceClauseCodes(evidence),
        documentUrl: evidence.documentUrl || undefined,
        evidenceId: evidence.evidenceId,
        name: evidence.documentEvidence,
        complianceResult,
      };
    })
    .sort(
      (a, b) =>
        (COMPLIANCE_SEVERITY[a.complianceResult ?? ''] ?? 9) -
          (COMPLIANCE_SEVERITY[b.complianceResult ?? ''] ?? 9) ||
        a.evidenceId.localeCompare(b.evidenceId),
    );
}

function needsWorkItem(
  standard: Standard,
  section: 'clauses' | 'annexA',
  clause: ClauseCoverageClause | AnnexAControlCoverage,
): NeedsWorkAttentionItem {
  const code = 'clauseCode' in clause ? clause.clauseCode : clause.code;
  const title = 'clauseTitle' in clause ? clause.clauseTitle : clause.title;
  return {
    reason: 'needsWork',
    key: `needsWork:${standard}:${section}:${code}`,
    standards: [standard],
    clauseCodes: [code],
    documentUrl: firstDocumentUrl(clause.evidence),
    standard,
    section,
    clauseCode: code,
    clauseTitle: title,
    rejectedEvidenceIds: clause.evidence.map((ref) => ref.evidenceId),
  };
}

function buildNeedsWorkItems(all: Evidence[]): NeedsWorkAttentionItem[] {
  const coverage = buildClauseCoverage(all);
  const items: NeedsWorkAttentionItem[] = [];

  for (const group of coverage.groups) {
    for (const clause of group.clauses) {
      if (clause.state === 'Covered (needs work)') {
        items.push(needsWorkItem(group.standard, 'clauses', clause));
      }
    }
  }

  for (const theme of coverage.annexA.themes) {
    for (const control of theme.controls) {
      if (control.state === 'Covered (needs work)') {
        // Annex A only exists for ISO 27001 (ISMS).
        items.push(needsWorkItem('ISMS', 'annexA', control));
      }
    }
  }

  const standardRank = (standard: Standard) =>
    STANDARDS_VALUES.indexOf(standard);

  return items.sort(
    (a, b) =>
      standardRank(a.standard) - standardRank(b.standard) ||
      (a.section === b.section ? 0 : a.section === 'clauses' ? -1 : 1) ||
      a.clauseCode.localeCompare(b.clauseCode, undefined, { numeric: true }),
  );
}

export function buildNeedsAttention(
  all: Evidence[],
  referenceDate: Date = new Date(),
): NeedsAttentionResponse {
  const overdue = buildOverdueItems(all, referenceDate);
  const rejected = buildRejectedItems(all);
  const needsWork = buildNeedsWorkItems(all);

  const items: NeedsAttentionItem[] = [...overdue, ...rejected, ...needsWork];
  // The per-category builders already sort internally; this only enforces the
  // fixed cross-category order (overdue → rejected → needsWork).
  items.sort((a, b) => REASON_ORDER[a.reason] - REASON_ORDER[b.reason]);

  return {
    items,
    totals: {
      overdue: overdue.length,
      rejected: rejected.length,
      needsWork: needsWork.length,
      total: items.length,
    },
  };
}
