import type { EvidenceDocument, SortDirection, SortKey } from '../types/evidence';

function sortValue(doc: EvidenceDocument, key: SortKey): string | number {
  switch (key) {
    case 'dueDate':
      return new Date(doc.dueDate).getTime();
    case 'clauses':
      return Math.min(...doc.clauses.map((clause) => parseFloat(clause)));
    default:
      return doc[key];
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
