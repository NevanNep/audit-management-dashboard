import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { readFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { Evidence } from './../src/evidence/evidence.types';

const WORKBOOK_URL = 'https://example.com/evidence.xlsx';
const WORKBOOK_PATH = join(
  __dirname,
  '../data/audit_dashboard_excel_simulation_revised.xlsx',
);

describe('EvidenceController (e2e)', () => {
  let app: INestApplication<App>;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(async () => {
    process.env.EVIDENCE_WORKBOOK_URL = WORKBOOK_URL;

    const workbookBuffer = readFileSync(WORKBOOK_PATH);
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(workbookBuffer),
    } as unknown as Response);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api/evidence (GET) returns 200 with the expected evidence records', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/evidence')
      .expect(200);

    const body = response.body as Evidence[];

    expect(fetchSpy).toHaveBeenCalledWith(WORKBOOK_URL);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(30);

    const [first] = body;
    expect(first).toEqual({
      evidenceId: 'EVD-001',
      documentEvidence: 'Firewall Configuration Review',
      standards: [
        { standard: 'ISMS', clauses: ['8.1'] },
        { standard: 'PIMS', clauses: ['8.1'] },
      ],
      location: 'United States',
      evidenceStatus: 'Accepted',
      complianceResult: 'Compliant',
      documentUrl:
        'https://contoso.sharepoint.com/sites/AuditEvidence/Documents/firewall-configuration-review.pdf',
    });
  });

  afterEach(async () => {
    fetchSpy.mockRestore();
    delete process.env.EVIDENCE_WORKBOOK_URL;
    await app.close();
  });
});
