import { Module } from '@nestjs/common';
import { EvidenceController } from './evidence.controller';
import { EvidenceService } from './evidence.service';
import { EVIDENCE_SOURCE } from './sources/evidence-source.interface';
import { LocalExcelEvidenceSource } from './sources/local-excel-evidence.source';

@Module({
  controllers: [EvidenceController],
  providers: [
    EvidenceService,
    { provide: EVIDENCE_SOURCE, useClass: LocalExcelEvidenceSource },
  ],
})
export class EvidenceModule {}
