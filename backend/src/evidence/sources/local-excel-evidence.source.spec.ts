import { InternalServerErrorException } from '@nestjs/common';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Workbook, Worksheet } from 'exceljs';
import { LocalExcelEvidenceSource } from './local-excel-evidence.source';

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

describe('LocalExcelEvidenceSource', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'evidence-source-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  async function writeWorkbook(
    fileName: string,
    build: (workbook: Workbook) => Worksheet | void,
  ): Promise<string> {
    const workbook = new Workbook();
    build(workbook);
    const filePath = join(tempDir, fileName);
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  function addHeaderRow(worksheet: Worksheet): void {
    worksheet.addRow(HEADERS);
  }

  it('maps a valid Excel row into an Evidence object', async () => {
    const filePath = await writeWorkbook('valid.xlsx', (workbook) => {
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

    const source = new LocalExcelEvidenceSource(filePath);
    const result = await source.findAll();

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
    const filePath = await writeWorkbook('empty-row.xlsx', (workbook) => {
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

    const source = new LocalExcelEvidenceSource(filePath);
    const result = await source.findAll();

    expect(result).toHaveLength(1);
    expect(result[0].document).toBe('Access Control Policy');
  });

  it('detects a missing worksheet', async () => {
    const filePath = await writeWorkbook('no-worksheet.xlsx', (workbook) => {
      workbook.addWorksheet('Other_Sheet');
    });

    const source = new LocalExcelEvidenceSource(filePath);

    await expect(source.findAll()).rejects.toThrow(
      new InternalServerErrorException(
        'Worksheet Evidence_Data was not found.',
      ),
    );
  });

  it('detects a missing required header', async () => {
    const filePath = await writeWorkbook('missing-header.xlsx', (workbook) => {
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

    const source = new LocalExcelEvidenceSource(filePath);

    await expect(source.findAll()).rejects.toThrow(
      new InternalServerErrorException(
        "Required Excel header 'Document URL' was not found.",
      ),
    );
  });

  it('detects an invalid Evidence status', async () => {
    const filePath = await writeWorkbook('invalid-status.xlsx', (workbook) => {
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

    const source = new LocalExcelEvidenceSource(filePath);

    await expect(source.findAll()).rejects.toThrow(
      new InternalServerErrorException(
        "Invalid Evidence status 'accept' at Excel row 3.",
      ),
    );
  });

  it('converts a valid Excel Date into YYYY-MM-DD', async () => {
    const filePath = await writeWorkbook('date-cell.xlsx', (workbook) => {
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

    const source = new LocalExcelEvidenceSource(filePath);
    const result = await source.findAll();

    expect(result[0].dueDate).toBe('2026-05-20');
  });

  it('throws a clear error when the workbook file does not exist', async () => {
    const source = new LocalExcelEvidenceSource(
      join(tempDir, 'does-not-exist.xlsx'),
    );

    await expect(source.findAll()).rejects.toThrow(
      new InternalServerErrorException('Excel evidence file was not found.'),
    );
  });
});
