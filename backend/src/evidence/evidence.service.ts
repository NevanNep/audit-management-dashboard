import { Inject, Injectable } from '@nestjs/common';
import { Evidence } from './evidence.types';
import { EVIDENCE_SOURCE } from './sources/evidence-source.interface';
import type { EvidenceSource } from './sources/evidence-source.interface';
import {
  buildEvidencePage,
  buildEvidenceStats,
  EvidenceFilterParams,
  EvidencePage,
  EvidenceQuery,
  EvidenceStats,
} from './evidence-query.util';

const CACHE_TTL_MS = 30_000;

@Injectable()
export class EvidenceService {
  private cachedEvidence: Evidence[] | null = null;
  private cacheExpiresAt = 0;

  constructor(
    @Inject(EVIDENCE_SOURCE) private readonly evidenceSource: EvidenceSource,
  ) {}

  findAll(): Promise<Evidence[]> {
    return this.getAll();
  }

  async findPage(query: EvidenceQuery): Promise<EvidencePage> {
    const all = await this.getAll();
    return buildEvidencePage(all, query);
  }

  async getStats(filters: EvidenceFilterParams): Promise<EvidenceStats> {
    const all = await this.getAll();
    return buildEvidenceStats(all, filters);
  }

  /** Reused by both the paginated list and the stats endpoint so a single
   * dashboard load doesn't re-download and re-parse the source spreadsheet twice. */
  private async getAll(): Promise<Evidence[]> {
    const now = Date.now();
    if (this.cachedEvidence && now < this.cacheExpiresAt) {
      return this.cachedEvidence;
    }

    const data = await this.evidenceSource.findAll();
    this.cachedEvidence = data;
    this.cacheExpiresAt = now + CACHE_TTL_MS;
    return data;
  }
}
