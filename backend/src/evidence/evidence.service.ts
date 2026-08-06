import { Inject, Injectable } from '@nestjs/common';
import { Evidence } from './evidence.types';
import { EVIDENCE_SOURCE } from './sources/evidence-source.interface';
import type { EvidenceSource } from './sources/evidence-source.interface';

@Injectable()
export class EvidenceService {
  constructor(
    @Inject(EVIDENCE_SOURCE) private readonly evidenceSource: EvidenceSource,
  ) {}

  findAll(): Promise<Evidence[]> {
    return this.evidenceSource.findAll();
  }
}
