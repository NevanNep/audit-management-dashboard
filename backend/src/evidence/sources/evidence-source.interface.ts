import { Evidence } from '../evidence.types';

export const EVIDENCE_SOURCE = 'EVIDENCE_SOURCE';

export interface EvidenceSource {
  findAll(): Promise<Evidence[]>;
}
