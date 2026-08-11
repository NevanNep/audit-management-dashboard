import { InternalServerErrorException } from '@nestjs/common';
import { Workbook, Worksheet } from 'exceljs';
import { UrlExcelEvidenceSource } from './url-excel-evidence.source';

const WORKBOOK_URL = 'https://example.com/evidence.xlsx';

const HEADERS = [
  'Document ID',
  'Document',
  'Standards',
  'Clause',
  'Location',
  'Evidence status',
  'Compliance result',
  'Due date',
  'Document URL',
];

describe('UrlExcelEvidenceSource', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  async function buildWorkbookBuffer(
    build: (workbook: Workbook) => Worksheet | void,
  ): Promise<Buffer> {
    const workbook = new Workbook();
    build(workbook);
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  function mockFetchResponse(options: {
    ok: boolean;
    status?: number;
    body?: Buffer;
  }): void {
    fetchSpy.mockResolvedValue({
      ok: options.ok,
      status: options.status ?? 200,
      arrayBuffer: () => Promise.resolve(options.body),
    } as unknown as Response);
  }

  function addHeaderRow(worksheet: Worksheet): void {
    worksheet.addRow(HEADERS);
  }

  it('maps a valid Excel row into an Evidence object', async () => {
    const buffer = await buildWorkbookBuffer((workbook) => {
      const sheet = workbook.addWorksheet('Evidence_Data');
      addHeaderRow(sheet);
      sheet.addRow([
        'DOC-0001',
        'Firewall Configuration Review',
        'ISMS',
        '8.1 Operational planning and control',
        'United States',
        'Accepted',
        'Compliant',
        '2026-05-20',
        'https://example.sharepoint.com/document.pdf',
      ]);
    });
    mockFetchResponse({ ok: true, body: buffer });

    const source = new UrlExcelEvidenceSource(WORKBOOK_URL);
    const result = await source.findAll();

    expect(fetchSpy).toHaveBeenCalledWith(WORKBOOK_URL);
    expect(result).toEqual([
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
    ]);
  });

  it('skips an empty row', async () => {
    const buffer = await buildWorkbookBuffer((workbook) => {
      const sheet = workbook.addWorksheet('Evidence_Data');
      addHeaderRow(sheet);
      sheet.addRow([]);
      sheet.addRow([
        'DOC-0002',
        'Access Control Policy',
        'ITSMS',
        '9.1 Monitoring',
        'Germany',
        'Pending Review',
        'Not assessed',
        '2026-06-01',
        'https://example.sharepoint.com/acp.pdf',
      ]);
    });
    mockFetchResponse({ ok: true, body: buffer });

    const source = new UrlExcelEvidenceSource(WORKBOOK_URL);
    const result = await source.findAll();

    expect(result).toHaveLength(1);
    expect(result[0].document).toBe('Access Control Policy');
  });

  it('detects a missing worksheet', async () => {
    const buffer = await buildWorkbookBuffer((workbook) => {
      workbook.addWorksheet('Other_Sheet');
    });
    mockFetchResponse({ ok: true, body: buffer });

    const source = new UrlExcelEvidenceSource(WORKBOOK_URL);

    await expect(source.findAll()).rejects.toThrow(
      new InternalServerErrorException(
        'Worksheet Evidence_Data was not found.',
      ),
    );
  });

  it('detects a missing required header', async () => {
    const buffer = await buildWorkbookBuffer((workbook) => {
      const sheet = workbook.addWorksheet('Evidence_Data');
      sheet.addRow([
        'Document ID',
        'Document',
        'Standards',
        'Clause',
        'Location',
        'Evidence status',
        'Compliance result',
        'Due date',
      ]);
    });
    mockFetchResponse({ ok: true, body: buffer });

    const source = new UrlExcelEvidenceSource(WORKBOOK_URL);

    await expect(source.findAll()).rejects.toThrow(
      new InternalServerErrorException(
        "Required Excel header 'Document URL' was not found.",
      ),
    );
  });

  it('detects an invalid Evidence status', async () => {
    const buffer = await buildWorkbookBuffer((workbook) => {
      const sheet = workbook.addWorksheet('Evidence_Data');
      addHeaderRow(sheet);
      sheet.addRow([]);
      sheet.addRow([
        'DOC-0003',
        'Incident Response Plan',
        'ISMS',
        '5.2 Policy',
        'Singapore',
        'accept',
        'Compliant',
        '2026-05-20',
        'https://example.sharepoint.com/irp.pdf',
      ]);
    });
    mockFetchResponse({ ok: true, body: buffer });

    const source = new UrlExcelEvidenceSource(WORKBOOK_URL);

    await expect(source.findAll()).rejects.toThrow(
      new InternalServerErrorException(
        "Invalid Evidence status 'accept' at Excel row 3.",
      ),
    );
  });

  it('converts a valid Excel Date into YYYY-MM-DD', async () => {
    const buffer = await buildWorkbookBuffer((workbook) => {
      const sheet = workbook.addWorksheet('Evidence_Data');
      addHeaderRow(sheet);
      const row = sheet.addRow([
        'DOC-0004',
        'Risk Assessment Register',
        'PIMS',
        '6.1 Actions',
        'Canada',
        'Missing',
        'Non-compliant',
        new Date(Date.UTC(2026, 4, 20)),
        'https://example.sharepoint.com/rar.pdf',
      ]);
      row.getCell(8).numFmt = 'yyyy-mm-dd';
    });
    mockFetchResponse({ ok: true, body: buffer });

    const source = new UrlExcelEvidenceSource(WORKBOOK_URL);
    const result = await source.findAll();

    expect(result[0].dueDate).toBe('2026-05-20');
  });

  it('throws a clear error when no workbook URL is configured', async () => {
    const source = new UrlExcelEvidenceSource(undefined);

    await expect(source.findAll()).rejects.toThrow(
      new InternalServerErrorException(
        'EVIDENCE_WORKBOOK_URL is not configured.',
      ),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws a clear error when the download fails', async () => {
    mockFetchResponse({ ok: false, status: 404 });

    const source = new UrlExcelEvidenceSource(WORKBOOK_URL);

    await expect(source.findAll()).rejects.toThrow(
      new InternalServerErrorException(
        'Excel evidence file could not be downloaded (status 404).',
      ),
    );
  });

  it('throws a clear error when the fetch itself fails', async () => {
    fetchSpy.mockRejectedValue(new Error('network error'));

    const source = new UrlExcelEvidenceSource(WORKBOOK_URL);

    await expect(source.findAll()).rejects.toThrow(
      new InternalServerErrorException(
        'Excel evidence file could not be downloaded.',
      ),
    );
  });
});
