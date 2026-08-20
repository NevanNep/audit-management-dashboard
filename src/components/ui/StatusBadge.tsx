import { COMPLIANCE_RESULT_STYLES, EVIDENCE_STATUS_STYLES } from '../../utils/statusColors';
import type { ComplianceResult, EvidenceStatus } from '../../types/evidence';

export function EvidenceStatusBadge({ status }: { status: EvidenceStatus }) {
  const style = EVIDENCE_STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-2 pr-2.5 text-[13px] font-semibold ${style.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {status}
    </span>
  );
}

export function ComplianceResultBadge({ result }: { result: ComplianceResult }) {
  const style = COMPLIANCE_RESULT_STYLES[result];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border-[1.5px] bg-white px-2.5 py-1 text-[13px] font-semibold ${style.border} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-sm ${style.icon}`} aria-hidden="true" />
      {result}
    </span>
  );
}
