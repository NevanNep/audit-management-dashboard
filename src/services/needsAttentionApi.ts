import type { NeedsAttentionResponse } from '../types/needsAttention';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

// The queue is computed server-side; the frontend only renders and filters what
// it returns. No query params — the Reason / Standard / search filters are all
// applied client-side (the list is small and already fully in memory).
export async function fetchNeedsAttention(): Promise<NeedsAttentionResponse> {
  const response = await fetch(`${API_URL}/evidence/needs-attention`);
  if (!response.ok) {
    throw new Error(`Failed to load needs-attention queue (${response.status})`);
  }
  return response.json() as Promise<NeedsAttentionResponse>;
}
