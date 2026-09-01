import type { ComplianceResult, EvidenceStatus } from '../types/evidence';

// One shared palette visualizes each state everywhere it appears — evidence dots,
// compliance marks, bar fills, segments — so "green" (etc.) reads identically
// across the Evidence and Compliance columns and the sidebar stats. Text keeps
// the darker design-system tokens for legibility on white.
//
//   accepted / compliant       → emerald-500
//   pending  / partial         → amber-500
//   rejected / non-compliant   → rose-500
//   missing  / not assessed    → slate-400
export const EVIDENCE_STATUS_STYLES: Record<EvidenceStatus, { pill: string; border: string; text: string; dot: string }> = {
  Accepted: { pill: 'bg-surface text-ev-accepted', border: 'border-ev-accepted/35', text: 'text-ev-accepted', dot: 'bg-emerald-500' },
  'Pending Review': { pill: 'bg-surface text-ev-pending', border: 'border-ev-pending/35', text: 'text-ev-pending', dot: 'bg-amber-500' },
  Rejected: { pill: 'bg-surface text-ev-rejected', border: 'border-ev-rejected/35', text: 'text-ev-rejected', dot: 'bg-rose-500' },
  Missing: { pill: 'bg-surface text-ev-missing', border: 'border-border-strong', text: 'text-ev-missing', dot: 'bg-slate-400' },
};

// `icon` fills the sidebar stat bars/segments; `mark` is the small 8px square in
// the table's Compliance cell — filled for the three assessed states, a 1.5px
// outline for the neutral ones. Both use the shared state palette above.
export const COMPLIANCE_RESULT_STYLES: Record<ComplianceResult, { border: string; text: string; icon: string; mark: string }> = {
  'Not assessed': { border: 'border-border-strong', text: 'text-neutral', icon: 'bg-slate-400', mark: 'border-[1.5px] border-slate-400' },
  Compliant: { border: 'border-compliant/40', text: 'text-compliant', icon: 'bg-emerald-500', mark: 'bg-emerald-500' },
  'Partially compliant': { border: 'border-partial/40', text: 'text-partial', icon: 'bg-amber-500', mark: 'bg-amber-500' },
  'Non-compliant': { border: 'border-noncompliant/40', text: 'text-noncompliant', icon: 'bg-rose-500', mark: 'bg-rose-500' },
  'Not applicable': { border: 'border-border-strong', text: 'text-neutral', icon: 'bg-slate-400', mark: 'border-[1.5px] border-slate-400' },
};

export function complianceIconColor(result: ComplianceResult): string {
  return COMPLIANCE_RESULT_STYLES[result].icon;
}

export function evidenceDotColor(status: EvidenceStatus): string {
  return EVIDENCE_STATUS_STYLES[status].dot;
}
