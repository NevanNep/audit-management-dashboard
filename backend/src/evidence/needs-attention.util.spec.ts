import { Evidence } from './evidence.types';
import { buildNeedsAttention } from './needs-attention.util';

const REFERENCE = new Date('2026-09-08T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(n: number): string {
  return new Date(REFERENCE.getTime() - n * DAY_MS).toISOString().slice(0, 10);
}

function evidence(overrides: Partial<Evidence>): Evidence {
  return {
    evidenceId: 'EVD-000',
    documentEvidence: 'Doc',
    standards: [{ standard: 'ISMS', clauses: ['A.8.9'] }],
    location: 'United States',
    evidenceStatus: 'Accepted',
    complianceResult: 'Compliant',
    documentUrl: 'https://example.com/doc.pdf',
    ...overrides,
  };
}

describe('buildNeedsAttention', () => {
  // One plain-overdue doc, one plain-rejected doc, one doc that is BOTH overdue
  // and rejected, one management clause whose only evidence is Rejected, one
  // Annex A control likewise, plus noise (healthy accepted doc, future due).
  const fixture: Evidence[] = [
    evidence({
      evidenceId: 'EVD-OVERDUE',
      documentEvidence: 'Risk Assessment Report',
      standards: [{ standard: 'ISMS', clauses: ['A.8.8'] }],
      evidenceStatus: 'Accepted',
      dueDate: daysAgo(27),
    }),
    evidence({
      evidenceId: 'EVD-REJECTED',
      documentEvidence: 'Risk Treatment Plan',
      standards: [{ standard: 'ISMS', clauses: ['9.2.2'] }],
      evidenceStatus: 'Rejected',
      complianceResult: 'Non-compliant',
      dueDate: daysAgo(-30),
    }),
    evidence({
      evidenceId: 'EVD-BOTH',
      documentEvidence: 'Internal Audit Report',
      standards: [{ standard: 'OHSMS', clauses: ['9.3'] }],
      evidenceStatus: 'Rejected',
      complianceResult: 'Partially compliant',
      dueDate: daysAgo(10),
    }),
    evidence({
      evidenceId: 'EVD-NW-CLAUSE',
      documentEvidence: 'Competence Records',
      standards: [{ standard: 'ISMS', clauses: ['9.2.1'] }],
      evidenceStatus: 'Rejected',
      complianceResult: 'Not assessed',
    }),
    evidence({
      evidenceId: 'EVD-NW-ANNEXA',
      documentEvidence: 'Malware Protection Review',
      standards: [{ standard: 'ISMS', clauses: ['A.8.7'] }],
      evidenceStatus: 'Rejected',
      complianceResult: 'Not assessed',
    }),
    evidence({
      evidenceId: 'EVD-HEALTHY',
      standards: [{ standard: 'ISMS', clauses: ['A.8.9'] }],
      evidenceStatus: 'Accepted',
      dueDate: daysAgo(-5),
    }),
  ];

  const result = buildNeedsAttention(fixture, REFERENCE);
  const byKey = (key: string) => result.items.find((item) => item.key === key);

  it('surfaces a known overdue document with the correct day count', () => {
    expect(byKey('overdue:EVD-OVERDUE')).toMatchObject({
      reason: 'overdue',
      evidenceId: 'EVD-OVERDUE',
      name: 'Risk Assessment Report',
      daysOverdue: 27,
      dueDate: daysAgo(27),
    });
  });

  it('surfaces a known rejected document with its Compliance Result as the only detail', () => {
    const item = byKey('rejected:EVD-REJECTED');
    expect(item).toMatchObject({
      reason: 'rejected',
      evidenceId: 'EVD-REJECTED',
      complianceResult: 'Non-compliant',
    });
    // no fabricated free-text rejection reason
    expect(item).not.toHaveProperty('rejectionReason');
  });

  it('falls back to null Compliance Result rather than a blank string', () => {
    const [item] = buildNeedsAttention(
      [
        evidence({
          evidenceId: 'EVD-NOCR',
          evidenceStatus: 'Rejected',
          complianceResult: '',
        }),
      ],
      REFERENCE,
    ).items;
    expect(item).toMatchObject({ reason: 'rejected', complianceResult: null });
  });

  it('surfaces a known needs-work management clause referencing its rejected evidence', () => {
    expect(byKey('needsWork:ISMS:clauses:9.2.1')).toMatchObject({
      reason: 'needsWork',
      standard: 'ISMS',
      section: 'clauses',
      clauseCode: '9.2.1',
      rejectedEvidenceIds: ['EVD-NW-CLAUSE'],
    });
  });

  it('surfaces a known needs-work Annex A control', () => {
    expect(byKey('needsWork:ISMS:annexA:A.8.7')).toMatchObject({
      reason: 'needsWork',
      standard: 'ISMS',
      section: 'annexA',
      clauseCode: 'A.8.7',
      rejectedEvidenceIds: ['EVD-NW-ANNEXA'],
    });
  });

  it('lists a doc that is both overdue AND rejected once per category, never within one', () => {
    const both = result.items.filter(
      (item) => 'evidenceId' in item && item.evidenceId === 'EVD-BOTH',
    );
    expect(both.map((item) => item.reason).sort()).toEqual([
      'overdue',
      'rejected',
    ]);
    expect(byKey('overdue:EVD-BOTH')).toBeDefined();
    expect(byKey('rejected:EVD-BOTH')).toBeDefined();
  });

  it('totals match the per-category item counts', () => {
    const count = (reason: string) =>
      result.items.filter((i) => i.reason === reason).length;

    // EVD-OVERDUE + EVD-BOTH
    expect(result.totals.overdue).toBe(2);
    expect(count('overdue')).toBe(2);
    // EVD-REJECTED + EVD-BOTH + EVD-NW-CLAUSE + EVD-NW-ANNEXA
    expect(result.totals.rejected).toBe(4);
    expect(count('rejected')).toBe(4);
    expect(result.totals.needsWork).toBe(count('needsWork'));
    expect(result.totals.total).toBe(
      result.totals.overdue + result.totals.rejected + result.totals.needsWork,
    );
    expect(result.items).toHaveLength(result.totals.total);
  });

  it('emits items in the fixed order overdue → rejected → needsWork', () => {
    const rank = ['overdue', 'rejected', 'needsWork'];
    const order = result.items.map((item) => rank.indexOf(item.reason));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('sorts the overdue queue by days overdue, descending', () => {
    const days = result.items
      .filter(
        (i): i is Extract<typeof i, { reason: 'overdue' }> =>
          i.reason === 'overdue',
      )
      .map((i) => i.daysOverdue);
    expect(days).toEqual([...days].sort((a, b) => b - a));
  });

  it('excludes healthy and future-dated evidence', () => {
    expect(
      result.items.some(
        (item) => 'evidenceId' in item && item.evidenceId === 'EVD-HEALTHY',
      ),
    ).toBe(false);
  });
});
