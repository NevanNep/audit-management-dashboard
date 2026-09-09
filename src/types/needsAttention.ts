import type { ComplianceResult } from './evidence';

// The "Needs Attention" queue is a read-only aggregation served by
// GET /api/evidence/needs-attention. It re-surfaces three signals already
// computed elsewhere — overdue evidence, rejected evidence, and clauses in the
// "Covered (needs work)" coverage state — merged into one list. It introduces
// no new status, score or persisted state.
export type NeedsAttentionReason = 'overdue' | 'rejected' | 'needsWork';

interface NeedsAttentionItemBase {
  reason: NeedsAttentionReason;
  /** Stable, unique key across the merged list. */
  key: string;
  /** Standards this item belongs to — drives the Standard filter. */
  standards: string[];
  /** Clause / control codes shown in the Clause column. */
  clauseCodes: string[];
  /** External URL of the document that must be fixed, when one exists. */
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
  /** The evidence's existing Compliance Result — the only reason detail
   *  available. `null` when the field is empty. No free-text reason exists. */
  complianceResult: ComplianceResult | null;
}

export interface NeedsWorkAttentionItem extends NeedsAttentionItemBase {
  reason: 'needsWork';
  standard: string;
  /** Which Clause Coverage sub-page the clause/control lives on. */
  section: 'clauses' | 'annexA';
  clauseCode: string;
  clauseTitle: string;
  /** The rejected document id(s) that are this clause's only mapped evidence. */
  rejectedEvidenceIds: string[];
}

export type NeedsAttentionItem =
  | OverdueAttentionItem
  | RejectedAttentionItem
  | NeedsWorkAttentionItem;

export interface NeedsAttentionResponse {
  items: NeedsAttentionItem[];
  totals: {
    overdue: number;
    rejected: number;
    needsWork: number;
    total: number;
  };
}

export const ALL_REASONS = 'All reasons';
export type ReasonFilterValue = typeof ALL_REASONS | NeedsAttentionReason;

export const REASON_LABEL: Record<NeedsAttentionReason, string> = {
  overdue: 'Overdue',
  rejected: 'Rejected',
  needsWork: 'Covered — needs work',
};
