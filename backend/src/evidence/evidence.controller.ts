import { Controller, Get, Query } from '@nestjs/common';
import { EvidenceService } from './evidence.service';
import type { EvidencePage, EvidenceStats } from './evidence-query.util';
import { parseEvidenceQuery, parseFilterParams } from './evidence-query.parser';
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
}
