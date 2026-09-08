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

  it('counts Pending Review as affirmative evidence — clause is Covered', () => {
    expect(
      clause('ISMS', '5.2', [
        on('ISMS', ['5.2'], { evidenceStatus: 'Pending Review' }),
      ]).state,
    ).toBe('Covered');
  });

  it('treats Rejected-only evidence as Covered (needs work), not plain Covered', () => {
    expect(
      clause('ISMS', '5.2', [
        on('ISMS', ['5.2'], { evidenceStatus: 'Rejected' }),
      ]).state,
    ).toBe('Covered (needs work)');
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

// ─── Annex A controls (ISO/IEC 27001:2022) ─────────────────────────────────

describe('buildClauseCoverage — Annex A', () => {
  const annexA = (all: Evidence[]) => buildClauseCoverage(all).annexA;

  const control = (code: string, all: Evidence[]) => {
    const found = annexA(all)
      .themes.flatMap((theme) => theme.controls)
      .find((entry) => entry.code === code);
    if (!found) throw new Error(`Annex A control ${code} not found`);
    return found;
  };

  it('exposes the full 2022 catalogue grouped into four themes', () => {
    const section = annexA([]);
    expect(section.isoCode).toBe('ISO 27001');
    expect(section.edition).toBe('2022');
    expect(section.controlCount).toBe(93);
    expect(section.themes.map((t) => t.theme)).toEqual([
      'Organizational',
      'People',
      'Physical',
      'Technological',
    ]);
    expect(section.themes.reduce((sum, t) => sum + t.controlCount, 0)).toBe(93);
  });

  it('marks a control Covered from an A-prefixed exact-code document', () => {
    const result = control('A.5.15', [
      on('ISMS', ['A.5.15'], { evidenceId: 'EVD-AC' }),
    ]);
    expect(result.state).toBe('Covered');
    expect(result.evidence.map((e) => e.evidenceId)).toEqual(['EVD-AC']);
    expect(result.evidence[0].mappedVia).toBe('exact');
  });

  it('rolls a whole-theme mapping down onto its child controls as "parent"', () => {
    const result = control('A.5.15', [
      on('ISMS', ['A.5'], { evidenceId: 'EVD-THEME' }),
    ]);
    expect(result.state).toBe('Covered');
    expect(result.evidence[0].mappedVia).toBe('parent');
    expect(result.evidence[0].mappedClause).toBe('A.5');
  });

  it('does not count a Missing document', () => {
    expect(
      control('A.5.15', [on('ISMS', ['A.5.15'], { evidenceStatus: 'Missing' })])
        .state,
    ).toBe('Gap');
  });

  // ─── collision-zone: dual listing (clause ↔ Annex A control) ────────────

  describe('collision-zone dual listing', () => {
    // "8.1" is BOTH ISMS clause 8.1 and Annex A control number A.8.1.
    const bare = [on('ISMS', ['8.1'], { evidenceId: 'EVD-BARE' })];

    it('lists a bare collision code on the management clause, flagged ambiguous', () => {
      const c = clause('ISMS', '8.1', bare);
      expect(c.state).toBe('Covered');
      expect(c.ambiguous).toBe(true);
      expect(c.evidence[0].ambiguous).toBe(true);
      expect(c.evidence[0].counterpart).toEqual({
        code: 'A.8.1',
        title: 'User endpoint devices',
      });
    });

    it('mirrors the same document onto the Annex A control, flagged ambiguous', () => {
      const ctrl = control('A.8.1', bare);
      expect(ctrl.state).toBe('Covered');
      expect(ctrl.ambiguous).toBe(true);
      expect(ctrl.evidence.map((e) => e.evidenceId)).toEqual(['EVD-BARE']);
      expect(ctrl.evidence[0].ambiguous).toBe(true);
      expect(ctrl.evidence[0].counterpart).toEqual({
        code: '8.1',
        title: 'Operational planning and control',
      });
    });

    it('mirrors a parent-clause collision mapping down to both sides', () => {
      // 6.1 is a non-leaf ISMS clause and Annex A control A.6.1.
      const all = [on('ISMS', ['6.1'], { evidenceId: 'EVD-P' })];
      const child = clause('ISMS', '6.1.2', all);
      expect(child.ambiguous).toBe(true);
      expect(child.evidence[0].mappedVia).toBe('parent');
      expect(control('A.6.1', all).ambiguous).toBe(true);
    });

    it('does not cross a bare code into Annex A for non-ISMS standards', () => {
      const pims = [on('PIMS', ['8.1'], { evidenceId: 'EVD-PIMS' })];
      expect(control('A.8.1', pims).state).toBe('Gap');
      expect(control('A.8.1', pims).ambiguous).toBe(false);
    });

    it('leaves an explicit A-prefixed mapping unflagged', () => {
      const ctrl = control('A.8.1', [
        on('ISMS', ['A.8.1'], { evidenceId: 'EVD-AX' }),
      ]);
      expect(ctrl.ambiguous).toBe(false);
      expect(ctrl.evidence[0].ambiguous).toBeUndefined();
    });

    it('prefers the explicit mapping when a document carries both forms', () => {
      const ctrl = control('A.8.1', [
        on('ISMS', ['A.8.1', '8.1'], { evidenceId: 'EVD-DUP' }),
      ]);
      expect(ctrl.evidence).toHaveLength(1);
      expect(ctrl.evidence[0].ambiguous).toBeUndefined();
    });

    it('counts ambiguous rows in the rollups', () => {
      const isms = buildClauseCoverage(bare).groups.find(
        (g) => g.standard === 'ISMS',
      )!;
      expect(isms.ambiguousCount).toBeGreaterThanOrEqual(1);
      expect(buildClauseCoverage(bare).annexA.ambiguousCount).toBe(1);
      expect(buildClauseCoverage(bare).totals.ambiguous).toBe(
        isms.ambiguousCount,
      );
    });

    it('does not flag a Missing bare-code document', () => {
      const all = [
        on('ISMS', ['8.1'], { evidenceId: 'EVD-M', evidenceStatus: 'Missing' }),
      ];
      expect(control('A.8.1', all).state).toBe('Gap');
      expect(control('A.8.1', all).ambiguous).toBe(false);
    });
  });

  it('marks a Statement-of-Applicability exclusion Not Applicable with its justification', () => {
    // A.7.4 is an exclusion in annex-a-soa.json.
    const result = control('A.7.4', [
      on('ISMS', ['A.7.4'], { evidenceId: 'EVD-NA' }),
    ]);
    expect(result.state).toBe('Not Applicable');
    expect(result.applicable).toBe(false);
    expect(result.justification).toEqual(expect.any(String));
    expect(result.evidence).toEqual([]);
  });

  it('rolls theme and section counts up consistently', () => {
    const section = annexA([on('ISMS', ['A.5.15'], { evidenceId: 'EVD-1' })]);

    expect(section.applicableCount).toBe(
      section.controlCount - section.notApplicableCount,
    );
    expect(section.coveredCount).toBe(1);
    expect(section.coveragePercent).toBe(
      Math.round((section.coveredCount / section.applicableCount) * 100),
    );
    for (const key of [
      'coveredCount',
      'needsWorkCount',
      'gapCount',
      'notApplicableCount',
    ] as const) {
      expect(section[key]).toBe(
        section.themes.reduce((sum, theme) => sum + theme[key], 0),
      );
    }
  });

  it('flags the Statement of Applicability as unvalidated placeholder data', () => {
    const { soa } = annexA([]);
    expect(soa.validated).toBe(false);
    expect(soa.note).toMatch(/placeholder/i);
  });
});

// ─── Covered (needs work) — evidence exists but is entirely Rejected ────────

describe('buildClauseCoverage — Covered (needs work)', () => {
  const rejected = (over: Partial<Evidence> = {}): Partial<Evidence> => ({
    evidenceStatus: 'Rejected',
    ...over,
  });

  const control = (code: string, all: Evidence[]) => {
    const found = buildClauseCoverage(all)
      .annexA.themes.flatMap((theme) => theme.controls)
      .find((entry) => entry.code === code);
    if (!found) throw new Error(`Annex A control ${code} not found`);
    return found;
  };

  it('marks a clause whose only evidence was Rejected as Covered (needs work)', () => {
    const result = clause('ISMS', '5.2', [
      on('ISMS', ['5.2'], rejected({ evidenceId: 'EVD-R' })),
    ]);
    expect(result.state).toBe('Covered (needs work)');
    // the underlying evidence ref keeps its real status untouched
    expect(result.evidence.map((e) => e.evidenceId)).toEqual(['EVD-R']);
    expect(result.evidence[0].evidenceStatus).toBe('Rejected');
  });

  it('counts a needs-work clause towards coveredCount and coveragePercent', () => {
    const group = buildClauseCoverage(
      [on('ISMS', ['5.2'], rejected({ evidenceId: 'EVD-R' }))],
      { standard: 'ISMS' },
    ).groups[0];

    expect(group.needsWorkCount).toBe(1);
    expect(group.coveredCount).toBe(1);
    expect(group.coveragePercent).toBe(
      Math.round((group.coveredCount / group.applicableCount) * 100),
    );
  });

  it('is plain Covered when a Rejected doc is joined by an Accepted one (rule #2 wins)', () => {
    const result = clause('ISMS', '5.2', [
      on('ISMS', ['5.2'], rejected({ evidenceId: 'EVD-R' })),
      on('ISMS', ['5.2'], { evidenceId: 'EVD-A', evidenceStatus: 'Accepted' }),
    ]);
    expect(result.state).toBe('Covered');
  });

  it('is plain Covered when a Rejected doc is joined by a Pending Review one', () => {
    const result = clause('ISMS', '5.2', [
      on('ISMS', ['5.2'], rejected({ evidenceId: 'EVD-R' })),
      on('ISMS', ['5.2'], {
        evidenceId: 'EVD-P',
        evidenceStatus: 'Pending Review',
      }),
    ]);
    expect(result.state).toBe('Covered');
  });

  it('is still a Gap when the clause has no actual evidence at all', () => {
    expect(clause('ISMS', '5.2', []).state).toBe('Gap');
  });

  it('rolls a Rejected-only parent mapping down to its children as needs-work', () => {
    const all = [on('ISMS', ['9.2'], rejected({ evidenceId: 'EVD-IA' }))];

    for (const code of ['9.2.1', '9.2.2']) {
      const child = clause('ISMS', code, all);
      expect(child.state).toBe('Covered (needs work)');
      expect(child.evidence[0].mappedVia).toBe('parent');
      expect(child.evidence[0].mappedClause).toBe('9.2');
    }
  });

  it('composes with a collision-zone mapping — both needs-work AND ambiguous', () => {
    // "8.1" is BOTH ISMS clause 8.1 and Annex A control A.8.1.
    const bare = [on('ISMS', ['8.1'], rejected({ evidenceId: 'EVD-BARE' }))];

    const mgmtClause = clause('ISMS', '8.1', bare);
    expect(mgmtClause.state).toBe('Covered (needs work)');
    expect(mgmtClause.ambiguous).toBe(true);
    expect(mgmtClause.evidence[0].ambiguous).toBe(true);

    const ctrl = control('A.8.1', bare);
    expect(ctrl.state).toBe('Covered (needs work)');
    expect(ctrl.ambiguous).toBe(true);
    expect(ctrl.evidence[0].ambiguous).toBe(true);
  });

  it('reports needsWorkCount at group, Annex A section and totals level', () => {
    // 9.2.1 is a plain leaf (not a collision-zone code, so it does not mirror
    // onto Annex A); A.5.15 is an explicit Annex A control.
    const response = buildClauseCoverage([
      on('ISMS', ['9.2.1'], rejected({ evidenceId: 'EVD-R1' })),
      on('ISMS', ['A.5.15'], rejected({ evidenceId: 'EVD-R2' })),
    ]);

    const isms = response.groups.find((g) => g.standard === 'ISMS')!;
    expect(isms.needsWorkCount).toBe(1);
    expect(isms.coveredCount).toBeGreaterThanOrEqual(isms.needsWorkCount);

    expect(response.annexA.needsWorkCount).toBe(1);
    expect(response.annexA.coveredCount).toBeGreaterThanOrEqual(1);

    // totals.needsWork sums the management-clause groups (Annex A is separate)
    expect(response.totals.needsWork).toBe(
      response.groups.reduce((sum, g) => sum + g.needsWorkCount, 0),
    );
    expect(response.totals.covered).toBe(
      response.groups.reduce((sum, g) => sum + g.coveredCount, 0),
    );
  });
});
