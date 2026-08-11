import { CLAUSE_LABELS, getClauseDescription } from '../../data/clauses';
import type { ClauseCode, IsoCode } from '../../types/evidence';

interface ClauseTagProps {
  iso: IsoCode;
  clause: ClauseCode;
}

export function ClauseTag({ iso, clause }: ClauseTagProps) {
  return (
    <span
      title={getClauseDescription(iso, clause)}
      className="inline-block min-w-0 max-w-full truncate whitespace-nowrap rounded-md bg-slate-100 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-slate-600"
    >
      <span className="mr-1 font-mono">{clause}</span>
      {CLAUSE_LABELS[clause]}
    </span>
  );
}
