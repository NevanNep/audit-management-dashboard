import { ALL_KNOWN_CLAUSE_CODES } from '../data/clauses';
import { getIsoCodeByStandard } from '../data/isoStandards';
import type { ApiEvidence } from '../services/evidenceApi';
import type { ClauseCode, EvidenceDocument, EvidenceDocumentStandard } from '../types/evidence';

const KNOWN_CLAUSE_CODES = [...ALL_KNOWN_CLAUSE_CODES].sort((a, b) => b.length - a.length);

function parseClauseCode(clause: string): ClauseCode {
  const match = KNOWN_CLAUSE_CODES.find(
    (code) => clause === code || clause.startsWith(`${code} `),
  );
  return match ?? clause;
}

function mapStandard(entry: ApiEvidence['standards'][number]): EvidenceDocumentStandard {
  return {
    iso: getIsoCodeByStandard(entry.standard) ?? (entry.standard as EvidenceDocumentStandard['iso']),
    clauses: entry.clauses.map(parseClauseCode),
  };
}

export function mapEvidenceToDocument(evidence: ApiEvidence): EvidenceDocument {
  return {
    id: evidence.evidenceId,
    documentId: evidence.evidenceId,
    name: evidence.documentEvidence,
    standards: evidence.standards.map(mapStandard),
    location: evidence.location,
    evidenceStatus: evidence.evidenceStatus as EvidenceDocument['evidenceStatus'],
    complianceResult: evidence.complianceResult as EvidenceDocument['complianceResult'],
    dueDate: evidence.dueDate || undefined,
    documentUrl: evidence.documentUrl || undefined,
  };
}
