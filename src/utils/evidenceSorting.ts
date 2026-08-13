import type { EvidenceDocument, SortDirection, SortKey } from '../types/evidence';

function sortValue(doc: EvidenceDocument, key: SortKey): string | number {
  switch (key) {
    case 'dueDate':
      return doc.dueDate ? new Date(doc.dueDate).getTime() : Number.POSITIVE_INFINITY;
    case 'iso':
      return doc.standards
        .map((standard) => standard.iso)
        .sort()
        .join(', ');
    case 'clauses': {
      const allClauses = doc.standards.flatMap((standard) => standard.clauses);
      return allClauses.length
        ? Math.min(...allClauses.map((clause) => parseFloat(clause)))
        : Number.POSITIVE_INFINITY;
    }
    case 'documentId':
    case 'name':
    case 'location':
    case 'evidenceStatus':
    case 'complianceResult':
      return doc[key];
    default:
      return '';
  }
}

export function sortDocuments(
  docs: EvidenceDocument[],
  key: SortKey,
  direction: SortDirection,
): EvidenceDocument[] {
  const sorted = [...docs].sort((a, b) => {
    const aValue = sortValue(a, key);
    const bValue = sortValue(b, key);
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
  return sorted;
}
