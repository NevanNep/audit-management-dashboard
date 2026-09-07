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
  real Statement of Applicability feeds it. The same applies to
  `annex-a-soa.json`, which drives the Annex A Applicability filter and
  Not-Applicable state.
- Annex A control coverage (ISO 27001:2022) is computed from evidence whose
  clause token is written in the `A.x.y` form, or as a whole theme (`A.5`). A
  bare token outside the collision zone (`5.15`, `8.8`) is routed to the
  management-clause path only. A bare token **inside** the collision zone (see
  below) is now surfaced on *both* pages and flagged `ambiguous`.
- Parent-clause mappings roll up to *every* descendant leaf; a document mapped to
  a broad parent (e.g. ITSMS `8.6`) will mark all of `8.6.x` covered. This is
  hierarchy-correct but only as precise as the source mapping.

## Collision-zone evidence — needs human classification

14 bare codes are simultaneously a valid ISMS management clause **and** an Annex A
control number (Annex A only spans A.5–A.8): `5.1 5.2 5.3`, `6.1 6.2 6.3`,
`7.1 7.2 7.3 7.4 7.5`, `8.1 8.2 8.3`. These live in `COLLISION_ZONE_CODES`
(`clause-coverage.util.ts`).

**Current behaviour (dual listing).** An ISMS evidence row carrying one of these
codes as a *bare* token is shown in **both** places at once — against the
management clause *and* against the matching `A.<code>` control — and every such
mapping is flagged `ambiguous`, with a `counterpart` pointing at the other
requirement. The UI renders a **Dual meaning** tag on the row and the evidence
line, and both the Clauses and Annex A pages carry a **Mapping → Dual meaning**
filter to review them. This is deliberately generous: it makes the ambiguity
visible on the page a reviewer is already looking at, rather than silently
resolving it one way. It also means a control can be counted *Covered* purely on
an ambiguous mapping, so the Annex A coverage % is an upper bound until the
workbook is cleaned up.

A reviewer should confirm whether each row below was actually intended as the
Annex A control and, if so, re-map the evidence to `A.<code>` in the source
workbook (which clears the flag and drops the management-clause listing). Only
ISMS rows cross into Annex A — the PIMS rows are listed for context only.

| Evidence ID | Document | Standard | Token | Resolved as (management clause) | Could also mean (Annex A) |
| --- | --- | --- | --- | --- | --- |
| EVD-001 | Firewall Configuration Review | ISMS | `8.1` | 8.1 Operational planning and control | A.8.1 User endpoint devices |
| EVD-001 | Firewall Configuration Review | PIMS | `8.1` | 8.1 General | A.8.1 User endpoint devices |
| EVD-003 | Vulnerability Scan Report | ISMS | `8.1` | 8.1 Operational planning and control | A.8.1 User endpoint devices |
| EVD-009 | Risk Treatment Plan | ISMS | `6.1` | 6.1 Actions to address risks and opportunities | A.6.1 Screening |
| EVD-009 | Risk Treatment Plan | PIMS | `6.1` | 6.1 General | A.6.1 Screening |
| EVD-011 | Information Security Policy | ISMS | `5.2` | 5.2 Policy | A.5.2 Information security roles and responsibilities |
| EVD-011 | Information Security Policy | PIMS | `5.2` | 5.2 Context of the organization | A.5.2 Information security roles and responsibilities |
| EVD-014 | Security and Compliance Training Record | ISMS | `7.2` | 7.2 Competence | A.7.2 Physical entry |
| EVD-014 | Security and Compliance Training Record | ISMS | `7.3` | 7.3 Awareness | A.7.3 Securing offices, rooms and facilities |
| EVD-014 | Security and Compliance Training Record | PIMS | `7.2` | 7.2 Conditions for collection and processing | A.7.2 Physical entry |
| EVD-020 | Security Awareness Attendance | ISMS | `6.3` | 6.3 Planning of changes | A.6.3 Information security awareness, education and training |
| EVD-020 | Security Awareness Attendance | PIMS | `6.3` | 6.3 Organization of information security | A.6.3 Information security awareness, education and training |
| EVD-030 | Privileged Access Review | ISMS | `8.2` | 8.2 Information security risk assessment | A.8.2 Privileged access rights |
| EVD-030 | Privileged Access Review | PIMS | `8.2` | 8.2 Conditions for collection and processing | A.8.2 Privileged access rights |

Likely mis-mapped on document-name evidence alone: **EVD-020** (awareness
attendance vs. "Planning of changes"), **EVD-030** (privileged access review vs.
"Information security risk assessment"). The 3 unambiguous control rows in the
sample workbook (`5.15`, `5.9`, `8.8`) were already re-prefixed to `A.5.15`,
`A.5.9`, `A.8.8`.
