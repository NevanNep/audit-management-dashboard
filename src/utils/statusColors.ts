import type { ComplianceResult, EvidenceStatus } from '../types/evidence';

export const EVIDENCE_STATUS_STYLES: Record<EvidenceStatus, { pill: string; dot: string }> = {
  Requested: { pill: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  Uploaded: { pill: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  'Under review': { pill: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  Accepted: { pill: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  'Need revision': { pill: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
};

export const COMPLIANCE_RESULT_STYLES: Record<ComplianceResult, { border: string; text: string; icon: string }> = {
  'Not assessed': { border: 'border-slate-300', text: 'text-slate-600', icon: 'bg-slate-300' },
  Compliant: { border: 'border-emerald-400', text: 'text-emerald-700', icon: 'bg-emerald-500' },
  'Partially compliant': { border: 'border-amber-400', text: 'text-amber-700', icon: 'bg-amber-500' },
  'Non-compliant': { border: 'border-rose-400', text: 'text-rose-700', icon: 'bg-rose-500' },
  'Not applicable': { border: 'border-slate-300', text: 'text-slate-500', icon: 'bg-slate-300' },
};

export function complianceIconColor(result: ComplianceResult): string {
  return COMPLIANCE_RESULT_STYLES[result].icon;
}

export function evidenceDotColor(status: EvidenceStatus): string {
  return EVIDENCE_STATUS_STYLES[status].dot;
}
