import { CLAUSE_LABELS, getClauseDescription } from '../../data/clauses';
import type { ClauseCode, IsoCode } from '../../types/evidence';

interface ClauseTagProps {
  iso: IsoCode;
  clause: ClauseCode;
  expanded?: boolean;
}

export function ClauseTag({ iso, clause, expanded = false }: ClauseTagProps) {
  return (
    <span
      title={expanded ? undefined : getClauseDescription(iso, clause)}
      className={`inline align-middle text-[12px] text-slate-500 ${
        expanded ? 'whitespace-normal break-words' : 'whitespace-nowrap'
      }`}
    >
      <span className="font-mono font-medium text-slate-600">{clause}</span>
      {expanded && <span className="ml-1">{CLAUSE_LABELS[clause]}</span>}
    </span>
  );
}
