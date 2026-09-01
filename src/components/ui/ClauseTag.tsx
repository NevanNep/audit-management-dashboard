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
      className={`min-w-0 align-bottom text-[12px] text-ink-secondary ${
        expanded ? 'whitespace-normal break-words' : 'inline-block max-w-full truncate'
      }`}
    >
      <span className="font-mono text-[12px] font-medium text-clause-code">{clause}</span>
      {hasDescription && <span className="ml-1 text-ink-muted">{description}</span>}
    </span>
  );
}
