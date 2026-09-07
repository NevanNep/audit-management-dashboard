import { getStandardName } from '../data/isoStandards';
import type { IsoCode } from '../types/evidence';
import type { ClauseCoverageResponse } from '../types/clauseCoverage';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

// The coverage state for every clause is calculated by the backend — the
// frontend only renders what it returns. `standard` scopes the response to one
// management system; it does not change any clause's computed state.
export async function fetchClauseCoverage(standard?: IsoCode): Promise<ClauseCoverageResponse> {
  const params = new URLSearchParams();
  if (standard) params.set('standard', getStandardName(standard));
  const query = params.toString();

  const response = await fetch(`${API_URL}/evidence/clause-coverage${query ? `?${query}` : ''}`);
  if (!response.ok) {
    throw new Error(`Failed to load clause coverage (${response.status})`);
  }
  return response.json() as Promise<ClauseCoverageResponse>;
}
