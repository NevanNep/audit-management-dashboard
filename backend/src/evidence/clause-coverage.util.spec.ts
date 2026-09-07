import { Evidence } from './evidence.types';
import { buildClauseCoverage } from './clause-coverage.util';

function evidence(overrides: Partial<Evidence>): Evidence {
  return {
    evidenceId: 'EVD-000',
    documentEvidence: 'Doc',
    standards: [{ standard: 'ISMS', clauses: ['5.2'] }],
    location: 'United States',
    evidenceStatus: 'Accepted',
    complianceResult: 'Compliant',
    documentUrl: '',
    ...overrides,
  };
}

function on(
  standard: Evidence['standards'][number]['standard'],
  clauses: string[],
  overrides: Partial<Evidence> = {},
): Evidence {
  return evidence({ standards: [{ standard, clauses }], ...overrides });
}

function clause(
  standard: 'ISMS' | 'PIMS' | 'ABMS',
  code: string,
  all: Evidence[],
) {
  const group = buildClauseCoverage(all, { standard }).groups[0];
  const found = group.clauses.find((entry) => entry.clauseCode === code);
  if (!found) throw new Error(`clause ${code} not found for ${standard}`);
  return found;
}

describe('buildClauseCoverage', () => {
  // ─── exact clause mapping ────────────────────────────────────────────────

  it('marks an in-scope clause with an exact-code Accepted document as Covered', () => {
    const result = clause('ISMS', '5.2', [
      on('ISMS', ['5.2'], { evidenceId: 'EVD-1' }),
    ]);
    expect(result.state).toBe('Covered');
    expect(result.evidence.map((e) => e.evidenceId)).toEqual(['EVD-1']);
    expect(result.evidence[0].mappedVia).toBe('exact');
    expect(result.evidence[0].mappedClause).toBe('5.2');
  });

  it('does not spill an exact leaf mapping onto its siblings', () => {
    const all = [on('ISMS', ['9.2.1'], { evidenceId: 'EVD-1' })];
    expect(clause('ISMS', '9.2.1', all).state).toBe('Covered');
    expect(clause('ISMS', '9.2.2', all).state).toBe('Gap');
  });

  // ─── parent -> child mapping ────────────────────────────────────────────

  it('lets a parent-clause mapping cover its descendant requirement clauses', () => {
    // ISMS master: 9.2 "Internal audit" -> 9.2.1, 9.2.2 (the reported leaves).
    const all = [on('ISMS', ['9.2'], { evidenceId: 'EVD-IA' })];

    const general = clause('ISMS', '9.2.1', all);
    const programme = clause('ISMS', '9.2.2', all);

    expect(general.state).toBe('Covered');
    expect(programme.state).toBe('Covered');
    expect(general.evidence[0].mappedVia).toBe('parent');
    expect(general.evidence[0].mappedClause).toBe('9.2');
  });

  it('prefers the exact code when a document maps to both the leaf and its parent', () => {
    const result = clause('ISMS', '9.2.1', [
      on('ISMS', ['9.2', '9.2.1'], { evidenceId: 'EVD-BOTH' }),
    ]);
    expect(result.state).toBe('Covered');
    expect(result.evidence[0].mappedVia).toBe('exact');
  });

  // ─── unrelated clauses with similar prefixes ────────────────────────────

  it('does not match clauses that merely share a string prefix', () => {
    // ABMS master has 8.1, 8.10 and 8.11 as distinct leaves. "8.10".startsWith("8.1")
    // is true, so naive prefix matching would wrongly cover 8.10/8.11 from an 8.1 doc.
    const all = [on('ABMS', ['8.1'], { evidenceId: 'EVD-OPC' })];

    expect(clause('ABMS', '8.1', all).state).toBe('Covered');
    expect(clause('ABMS', '8.10', all).state).toBe('Gap');
    expect(clause('ABMS', '8.11', all).state).toBe('Gap');
  });

  it('does not let a parent mapping leak across branches of the tree', () => {
    // 9.2 must not reach 9.3.x even though both live under section 9.
    const all = [on('ISMS', ['9.2'], { evidenceId: 'EVD-IA' })];
    expect(clause('ISMS', '9.3.1', all).state).toBe('Gap');
  });

  it('normalizes clause tokens that carry a trailing title', () => {
    const result = clause('ISMS', '9.2.1', [
      on('ISMS', ['9.2 Internal audit'], { evidenceId: 'EVD-T' }),
    ]);
    expect(result.state).toBe('Covered');
    expect(result.evidence[0].mappedClause).toBe('9.2');
  });

  // ─── Missing evidence ──────────────────────────────────────────────────

  it('does not count Missing as actual evidence — clause stays a Gap', () => {
    const result = clause('ISMS', '5.2', [
      on('ISMS', ['5.2'], { evidenceId: 'EVD-M', evidenceStatus: 'Missing' }),
    ]);
    expect(result.state).toBe('Gap');
    expect(result.evidence).toEqual([]);
  });

  it('does not count Missing as actual evidence through a parent mapping either', () => {
    const result = clause('ISMS', '9.2.1', [
      on('ISMS', ['9.2'], { evidenceId: 'EVD-M', evidenceStatus: 'Missing' }),
    ]);
    expect(result.state).toBe('Gap');
  });

  it('counts Pending Review and Rejected as actual evidence', () => {
    expect(
      clause('ISMS', '5.2', [
        on('ISMS', ['5.2'], { evidenceStatus: 'Pending Review' }),
      ]).state,
    ).toBe('Covered');
    expect(
      clause('ISMS', '5.2', [
        on('ISMS', ['5.2'], { evidenceStatus: 'Rejected' }),
      ]).state,
    ).toBe('Covered');
  });

  it('marks an in-scope clause with no actual evidence as Gap', () => {
    expect(clause('ISMS', '5.2', []).state).toBe('Gap');
  });

  // ─── Not Applicable clauses ────────────────────────────────────────────

  it('marks clauses excluded from the audit scope as Not Applicable', () => {
    // PIMS clause 8.x is a Statement-of-Applicability exclusion in audit-scope.json.
    const result = clause('PIMS', '8.2.1', [
      on('PIMS', ['8.2.1'], { evidenceId: 'EVD-X' }),
    ]);
    expect(result.state).toBe('Not Applicable');
    expect(result.inScope).toBe(false);
    // an Accepted document — even an exact-code one — never makes it Covered
    expect(result.evidence).toEqual([]);
  });

  it('does not let a parent mapping cover an excluded descendant', () => {
    const result = clause('PIMS', '8.2.1', [
      on('PIMS', ['8'], { evidenceId: 'EVD-P' }),
    ]);
    expect(result.state).toBe('Not Applicable');
  });

  // ─── compliance result independence ────────────────────────────────────

  it('never lets Compliance Result decide coverage', () => {
    for (const complianceResult of [
      'Non-compliant',
      'Partially compliant',
      'Not assessed',
    ] as const) {
      const exact = clause('ISMS', '5.2', [
        on('ISMS', ['5.2'], { evidenceId: 'EVD-C', complianceResult }),
      ]);
      const viaParent = clause('ISMS', '9.2.1', [
        on('ISMS', ['9.2'], { evidenceId: 'EVD-C', complianceResult }),
      ]);
      expect(exact.state).toBe('Covered');
      expect(viaParent.state).toBe('Covered');
    }
  });

  // ─── aggregates ────────────────────────────────────────────────────────

  it('reports per-standard applicable count and coverage percentage', () => {
    const isms = buildClauseCoverage([
      on('ISMS', ['9.2'], { evidenceId: 'EVD-1' }),
    ]).groups.find((g) => g.standard === 'ISMS')!;

    expect(isms.notApplicableCount).toBe(0);
    expect(isms.applicableCount).toBe(isms.clauseCount);
    // 9.2 covers 9.2.1 + 9.2.2 => 2 covered of 30 applicable => 7%
    expect(isms.coveredCount).toBe(2);
    expect(isms.coveragePercent).toBe(
      Math.round((isms.coveredCount / isms.applicableCount) * 100),
    );
  });

  it('aggregates overall totals and flags the scope config as unvalidated', () => {
    const response = buildClauseCoverage([
      on('ISMS', ['5.2'], { evidenceId: 'EVD-1' }),
      on('ISMS', ['7.2'], { evidenceId: 'EVD-2', evidenceStatus: 'Missing' }),
    ]);
    expect(response.totals.covered).toBe(1);
    expect(response.totals.clauses).toBe(
      response.groups.reduce((sum, g) => sum + g.clauseCount, 0),
    );
    expect(response.totals.applicable).toBe(
      response.groups.reduce((sum, g) => sum + g.applicableCount, 0),
    );
    expect(response.scope.validated).toBe(false);
    expect(response.scope.note).toMatch(/placeholder/i);
  });
});
