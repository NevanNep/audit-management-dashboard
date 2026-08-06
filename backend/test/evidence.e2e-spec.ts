import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { Evidence } from './../src/evidence/evidence.types';

describe('EvidenceController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
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

    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(30);

    const [first] = body;
    expect(first).toEqual({
      document: 'Firewall Configuration Review',
      standards: 'ISMS',
      clause: '8.1 Operational planning and control',
      location: 'United States',
      evidenceStatus: 'Accepted',
      complianceResult: 'Compliant',
      dueDate: '2026-05-20',
      documentUrl:
        'https://example.sharepoint.com/firewall-configuration-review.pdf',
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
