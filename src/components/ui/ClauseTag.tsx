import { getClauseDescription } from '../../data/clauses';
import type { ClauseCode, IsoCode } from '../../types/evidence';

interface ClauseTagProps {
  iso: IsoCode;
  clause: ClauseCode;
  expanded?: boolean;
}

export function ClauseTag({ iso, clause, expanded = false }: ClauseTagProps) {
  const description = getClauseDescription(iso, clause);
  const hasDescription = description !== clause;
  return (
    <span
      title={expanded || !hasDescription ? undefined : description}
      className={`inline align-middle text-[12px] text-slate-500 ${
        expanded ? 'whitespace-normal break-words' : 'whitespace-nowrap'
      }`}
    >
      <span className="font-mono font-medium text-slate-600">{clause}</span>
      {expanded && hasDescription && <span className="ml-1">{description}</span>}
    </span>
  );
}
