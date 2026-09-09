import { Controller, Get, Query } from '@nestjs/common';
import { EvidenceService } from './evidence.service';
import type { EvidencePage, EvidenceStats } from './evidence-query.util';
import type { ClauseCoverageResponse } from './clause-coverage.util';
import type { NeedsAttentionResponse } from './needs-attention.util';
import {
  parseClauseCoverageQuery,
  parseEvidenceQuery,
  parseFilterParams,
} from './evidence-query.parser';
import type { RawEvidenceQuery } from './evidence-query.parser';

@Controller('evidence')
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Get()
  findAll(@Query() raw: RawEvidenceQuery): Promise<EvidencePage> {
    return this.evidenceService.findPage(parseEvidenceQuery(raw));
  }

  @Get('stats')
  stats(@Query() raw: RawEvidenceQuery): Promise<EvidenceStats> {
    return this.evidenceService.getStats(parseFilterParams(raw));
  }

  @Get('clause-coverage')
  clauseCoverage(
    @Query() raw: RawEvidenceQuery,
  ): Promise<ClauseCoverageResponse> {
    return this.evidenceService.getClauseCoverage(
      parseClauseCoverageQuery(raw),
    );
  }

  @Get('needs-attention')
  needsAttention(): Promise<NeedsAttentionResponse> {
    return this.evidenceService.getNeedsAttention();
  }
}
