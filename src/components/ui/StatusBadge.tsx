import { COMPLIANCE_RESULT_STYLES, EVIDENCE_STATUS_STYLES } from '../../utils/statusColors';
import type { ComplianceResult, EvidenceStatus } from '../../types/evidence';

export function EvidenceStatusBadge({ status }: { status: EvidenceStatus }) {
  const style = EVIDENCE_STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border bg-surface px-2 py-[3px] text-[12.5px] font-medium ${style.border} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {status}
    </span>
  );
}

export function ComplianceResultBadge({ result }: { result: ComplianceResult }) {
  const style = COMPLIANCE_RESULT_STYLES[result];
  return (
    <span className={`inline-flex items-center gap-[7px] whitespace-nowrap text-[12.5px] font-medium leading-4 ${style.text}`}>
      <span className={`size-2 shrink-0 rounded-[1.5px] ${style.mark}`} aria-hidden="true" />
      {result}
    </span>
  );
}
