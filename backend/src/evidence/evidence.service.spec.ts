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
      documentId: 'DOC-0001',
      document: 'Firewall Configuration Review',
      standards: 'ISMS',
      clause: '8.1 Operational planning and control',
      location: 'United States',
      evidenceStatus: 'Accepted',
      complianceResult: 'Compliant',
      dueDate: '2026-05-20',
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
