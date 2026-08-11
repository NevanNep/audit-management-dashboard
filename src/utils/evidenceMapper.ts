import { CLAUSE_LABELS } from '../data/clauses';
import { getIsoCodeByStandard } from '../data/isoStandards';
import type { ApiEvidence } from '../services/evidenceApi';
import type { ClauseCode, EvidenceDocument } from '../types/evidence';

const KNOWN_CLAUSE_CODES = (Object.keys(CLAUSE_LABELS) as ClauseCode[]).sort(
  (a, b) => b.length - a.length,
);

function parseClauseCode(clause: string): ClauseCode {
  const match = KNOWN_CLAUSE_CODES.find(
    (code) => clause === code || clause.startsWith(`${code} `),
  );
  return (match ?? clause) as ClauseCode;
}

export function mapEvidenceToDocument(evidence: ApiEvidence, index: number): EvidenceDocument {
  return {
    id: `EVID-${String(index + 1).padStart(4, '0')}`,
    name: evidence.document,
    iso: getIsoCodeByStandard(evidence.standards) ?? (evidence.standards as EvidenceDocument['iso']),
    location: evidence.location,
    evidenceStatus: evidence.evidenceStatus as EvidenceDocument['evidenceStatus'],
    complianceResult: evidence.complianceResult as EvidenceDocument['complianceResult'],
    dueDate: evidence.dueDate,
    clauses: [parseClauseCode(evidence.clause)],
    documentUrl: evidence.documentUrl || undefined,
  };
}
