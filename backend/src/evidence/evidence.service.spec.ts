import { Test, TestingModule } from '@nestjs/testing';
import { EvidenceService } from './evidence.service';
import { Evidence } from './evidence.types';
import {
  EVIDENCE_SOURCE,
  EvidenceSource,
} from './sources/evidence-source.interface';

describe('EvidenceService', () => {
  let service: EvidenceService;
  let evidenceSource: jest.Mocked<EvidenceSource>;

  const sampleEvidence: Evidence[] = [
    {
      evidenceId: 'EVD-001',
      documentEvidence: 'Firewall Configuration Review',
      standards: [
        { standard: 'ISMS', clauses: ['8.1'] },
        { standard: 'PIMS', clauses: ['8.1'] },
      ],
      location: 'United States',
      evidenceStatus: 'Accepted',
      complianceResult: 'Compliant',
      documentUrl: 'https://example.sharepoint.com/document.pdf',
    },
  ];

  beforeEach(async () => {
    evidenceSource = { findAll: jest.fn().mockResolvedValue(sampleEvidence) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidenceService,
        { provide: EVIDENCE_SOURCE, useValue: evidenceSource },
      ],
    }).compile();

    service = module.get(EvidenceService);
  });

  it('delegates to the injected evidence source', async () => {
    const result = await service.findAll();

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.Mocked property reference, not a call
    expect(evidenceSource.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual(sampleEvidence);
  });
});
