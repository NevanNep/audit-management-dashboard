import clauseMaster from './iso/clause-master.json';
import clauseCrosswalk from './iso/clause-crosswalk.json';
import type { ClauseCode, IsoCode } from '../types/evidence';
import { getStandardName } from './isoStandards';

interface ClauseMasterRow {
  standard: string;
  clauseCode: string;
  clauseTitle: string | null;
}

interface CrosswalkRow {
  hlsAnchorClause: string | null;
  hlsAnchorTitle: string | null;
}

const MASTER_ROWS = clauseMaster as ClauseMasterRow[];
const CROSSWALK_ROWS = clauseCrosswalk as CrosswalkRow[];

// standard (e.g. "ISMS") -> clause code (e.g. "6.1.1") -> that standard's own title.
// Real clause trees diverge per standard (sub-clauses, restructured sections), so
// this is sourced from extracted ISO data rather than hand-typed.
const TITLES_BY_STANDARD_AND_CLAUSE: Record<string, Record<string, string>> = {};
for (const row of MASTER_ROWS) {
  if (!row.clauseTitle) continue;
  const byClause = (TITLES_BY_STANDARD_AND_CLAUSE[row.standard] ??= {});
  byClause[row.clauseCode] = row.clauseTitle;
}

// Every clause code seen anywhere in the source data, used to recognize/trim
// clause codes out of loosely formatted Excel cell text (see evidenceMapper.ts).
export const ALL_KNOWN_CLAUSE_CODES: string[] = Array.from(
  new Set(MASTER_ROWS.map((row) => row.clauseCode)),
);

// One neutral, standard-agnostic label per clause code — used where a single
// standard isn't in scope (e.g. the "all standards" clause filter dropdown).
// Sourced from the harmonized structure crosswalk, which doesn't cover every
// sub-clause; codes missing here simply render as their bare code.
export const CLAUSE_LABELS: Record<string, string> = {};
for (const row of CROSSWALK_ROWS) {
  if (row.hlsAnchorClause && row.hlsAnchorTitle && !(row.hlsAnchorClause in CLAUSE_LABELS)) {
    CLAUSE_LABELS[row.hlsAnchorClause] = row.hlsAnchorTitle;
  }
}

export function getClauseDescription(iso: IsoCode, clause: ClauseCode): string {
  const standard = getStandardName(iso);
  return TITLES_BY_STANDARD_AND_CLAUSE[standard]?.[clause] ?? CLAUSE_LABELS[clause] ?? clause;
}
