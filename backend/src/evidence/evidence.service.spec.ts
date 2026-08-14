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
    {
      evidenceId: 'EVD-002',
      documentEvidence: 'Access Control Policy',
      standards: [{ standard: 'ISMS', clauses: ['5.1'] }],
      location: 'Germany',
      evidenceStatus: 'Pending Review',
      complianceResult: 'Not assessed',
      documentUrl: '',
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

  it('caches the source result across calls within the TTL', async () => {
    await service.findAll();
    await service.findPage({
      page: 1,
      pageSize: 10,
      sortKey: 'documentId',
      sortDirection: 'asc',
    });
    await service.getStats({});

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.Mocked property reference, not a call
    expect(evidenceSource.findAll).toHaveBeenCalledTimes(1);
  });

  it('returns a paginated, filtered page of evidence', async () => {
    const result = await service.findPage({
      page: 1,
      pageSize: 10,
      location: 'Germany',
      sortKey: 'documentId',
      sortDirection: 'asc',
    });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].evidenceId).toBe('EVD-002');
  });

  it('returns aggregate stats over the full dataset', async () => {
    const stats = await service.getStats({});

    expect(stats.overall.total).toBe(2);
    expect(stats.locationOptions).toEqual(['Germany', 'United States']);
  });
});
