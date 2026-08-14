import { Evidence } from './evidence.types';
import { buildEvidencePage, buildEvidenceStats } from './evidence-query.util';

const DAY_MS = 24 * 60 * 60 * 1000;

function iso(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

const EVIDENCE: Evidence[] = [
  {
    evidenceId: 'EVD-003',
    documentEvidence: 'Firewall Configuration Review',
    standards: [
      { standard: 'ISMS', clauses: ['8.1', '9.2'] },
      { standard: 'PIMS', clauses: ['8.1'] },
    ],
    location: 'United States',
    evidenceStatus: 'Accepted',
    complianceResult: 'Compliant',
    dueDate: iso(10),
    documentUrl: 'https://example.com/a.pdf',
  },
  {
    evidenceId: 'EVD-001',
    documentEvidence: 'Access Control Policy',
    standards: [{ standard: 'ISMS', clauses: ['5.1'] }],
    location: 'Germany',
    evidenceStatus: 'Pending Review',
    complianceResult: 'Not assessed',
    dueDate: iso(-5),
    documentUrl: '',
  },
  {
    evidenceId: 'EVD-002',
    documentEvidence: 'Business Continuity Plan',
    standards: [{ standard: 'BCMS', clauses: ['8.1'] }],
    location: 'Germany',
    evidenceStatus: 'Rejected',
    complianceResult: 'Non-compliant',
    documentUrl: '',
  },
];

describe('buildEvidencePage', () => {
  it('sorts and paginates the full result set', () => {
    const page = buildEvidencePage(EVIDENCE, {
      page: 1,
      pageSize: 2,
      sortKey: 'documentId',
      sortDirection: 'asc',
    });

    expect(page.total).toBe(3);
    expect(page.items.map((e) => e.evidenceId)).toEqual(['EVD-001', 'EVD-002']);
  });

  it('returns the second page', () => {
    const page = buildEvidencePage(EVIDENCE, {
      page: 2,
      pageSize: 2,
      sortKey: 'documentId',
      sortDirection: 'asc',
    });

    expect(page.items.map((e) => e.evidenceId)).toEqual(['EVD-003']);
  });

  it('filters by search text against the document name', () => {
    const page = buildEvidencePage(EVIDENCE, {
      page: 1,
      pageSize: 10,
      search: 'firewall',
      sortKey: 'documentId',
      sortDirection: 'asc',
    });

    expect(page.items.map((e) => e.evidenceId)).toEqual(['EVD-003']);
  });

  it('filters by standard and clause together', () => {
    const page = buildEvidencePage(EVIDENCE, {
      page: 1,
      pageSize: 10,
      standard: 'ISMS',
      clause: '5.1',
      sortKey: 'documentId',
      sortDirection: 'asc',
    });

    expect(page.items.map((e) => e.evidenceId)).toEqual(['EVD-001']);
  });

  it('sorts by due date, treating a missing date as the largest value', () => {
    const ascending = buildEvidencePage(EVIDENCE, {
      page: 1,
      pageSize: 10,
      sortKey: 'dueDate',
      sortDirection: 'asc',
    });
    expect(ascending.items.map((e) => e.evidenceId)).toEqual([
      'EVD-001',
      'EVD-003',
      'EVD-002',
    ]);

    const descending = buildEvidencePage(EVIDENCE, {
      page: 1,
      pageSize: 10,
      sortKey: 'dueDate',
      sortDirection: 'desc',
    });
    expect(descending.items.map((e) => e.evidenceId)).toEqual([
      'EVD-002',
      'EVD-003',
      'EVD-001',
    ]);
  });
});

describe('buildEvidenceStats', () => {
  it('computes location options across the whole dataset regardless of filters', () => {
    const stats = buildEvidenceStats(EVIDENCE, { location: 'Germany' });
    expect(stats.locationOptions).toEqual(['Germany', 'United States']);
  });

  it('computes clause options scoped to the selected standard only', () => {
    const stats = buildEvidenceStats(EVIDENCE, { standard: 'ISMS' });
    expect(stats.clauseOptions).toEqual(['5.1', '8.1', '9.2']);
  });

  it('builds an overall card and one card per standard', () => {
    const stats = buildEvidenceStats(EVIDENCE, {});

    expect(stats.overall.total).toBe(3);
    expect(stats.overall.overdueCount).toBe(1);

    const isms = stats.byStandard.find((c) => c.standard === 'ISMS');
    expect(isms?.total).toBe(2);
    const bcms = stats.byStandard.find((c) => c.standard === 'BCMS');
    expect(bcms?.total).toBe(1);
  });

  it('restricts evidence-status/compliance-result counts by all filters, including standard and clause', () => {
    const stats = buildEvidenceStats(EVIDENCE, {
      standard: 'BCMS',
    });

    expect(stats.evidenceStatusCounts).toEqual([
      { value: 'Rejected', count: 1 },
    ]);
    expect(stats.complianceResultCounts).toEqual([
      { value: 'Non-compliant', count: 1 },
    ]);
  });
});
