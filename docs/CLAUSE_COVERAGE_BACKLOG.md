# Clause Coverage — backlog (needs product decisions)

These are intentionally **not implemented**. Each one changes what a coverage
number *means*, so it needs a product/audit decision before build.

## 1. "Verified — no document" state
A clause can be legitimately satisfied without a document (observation, interview,
system screenshot recorded elsewhere). Today that clause shows as **Gap**.
Open questions: who can set this state, what audit trail is required, does it
count towards the coverage % the same as a document-backed clause?

## 2. Automatic cross-standard evidence reuse
The ISO harmonised structure means one document often satisfies the equivalent
clause in several standards (e.g. ISMS 9.2 ≈ EnMS 9.2 ≈ BCMS 9.2). Today evidence
only counts for the standard/clause it is explicitly mapped to.
Open questions: is reuse automatic via a crosswalk, or an explicit reviewer
action? How is it shown so the coverage number stays defensible?

## 3. Audit-cycle / time dimension
Coverage is currently a single snapshot. Real audits care about "covered *this
cycle*", evidence going stale, and comparing cycle-over-cycle.
Open questions: what defines a cycle, when does evidence expire, do we keep
historical coverage snapshots?

## Related known limitations (see clause-coverage.util.ts)
- `audit-scope.json` is placeholder data; Not Applicable is provisional until a
  real Statement of Applicability feeds it.
- Evidence mapped to Annex A / control codes not present in the clause master
  (e.g. ISMS `5.15`, `8.8`) does not contribute to any coverage row.
- Parent-clause mappings roll up to *every* descendant leaf; a document mapped to
  a broad parent (e.g. ITSMS `8.6`) will mark all of `8.6.x` covered. This is
  hierarchy-correct but only as precise as the source mapping.
