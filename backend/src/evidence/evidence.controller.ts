import { Controller, Get } from '@nestjs/common';
import { EvidenceService } from './evidence.service';
import { Evidence } from './evidence.types';

@Controller('evidence')
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Get()
  findAll(): Promise<Evidence[]> {
    return this.evidenceService.findAll();
  }
}
