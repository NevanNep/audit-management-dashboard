export interface ApiEvidence {
  document: string;
  standards: string;
  clause: string;
  location: string;
  evidenceStatus: string;
  complianceResult: string;
  dueDate: string;
  documentUrl: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export async function fetchEvidence(): Promise<ApiEvidence[]> {
  const response = await fetch(`${API_URL}/evidence`);
  if (!response.ok) {
    throw new Error(`Failed to load evidence (${response.status})`);
  }
  return response.json();
}
