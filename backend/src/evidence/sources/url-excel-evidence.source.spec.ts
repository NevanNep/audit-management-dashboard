import { InternalServerErrorException } from '@nestjs/common';
import { Workbook, Worksheet } from 'exceljs';
import { UrlExcelEvidenceSource } from './url-excel-evidence.source';

const WORKBOOK_URL = 'https://example.com/evidence.xlsx';

const HEADERS = [
  'Evidence ID',
  'Document/Evidence',
  'Standard',
  'Clause',
  'Location',
  'Evidence Status',
  'Compliance Result',
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

  function buildRow(overrides: {
    evidenceId?: string;
    documentEvidence?: string;
    standard?: string;
    clause?: string;
    location?: string;
    evidenceStatus?: string;
    complianceResult?: string;
    documentUrl?: string;
  }): (string | undefined)[] {
    return [
      overrides.evidenceId ?? 'EVD-001',
      overrides.documentEvidence ?? 'Firewall Configuration Review',
      overrides.standard ?? 'ISMS',
      overrides.clause ?? '8.1',
      overrides.location ?? 'United States',
      overrides.evidenceStatus ?? 'Accepted',
      overrides.complianceResult ?? 'Compliant',
      overrides.documentUrl ?? 'https://example.sharepoint.com/document.pdf',
    ];
  }

  async function runFindAllWithRow(
    rowValues: (string | undefined)[],
  ): Promise<Awaited<ReturnType<UrlExcelEvidenceSource['findAll']>>> {
    const buffer = await buildWorkbookBuffer((workbook) => {
      const sheet = workbook.addWorksheet('Evidence_Data');
      addHeaderRow(sheet);
      sheet.addRow(rowValues);
    });
    mockFetchResponse({ ok: true, body: buffer });

    const source = new UrlExcelEvidenceSource(WORKBOOK_URL);
    return source.findAll();
  }

  it('maps a valid Excel row into an Evidence object', async () => {
    const buffer = await buildWorkbookBuffer((workbook) => {
      const sheet = workbook.addWorksheet('Evidence_Data');
      addHeaderRow(sheet);
      sheet.addRow(
        buildRow({
          evidenceId: 'EVD-0001',
          documentEvidence: 'Firewall Configuration Review',
          standard: 'ISMS',
          clause: '8.1',
          location: 'United States',
          evidenceStatus: 'Accepted',
          complianceResult: 'Compliant',
          documentUrl: 'https://example.sharepoint.com/document.pdf',
        }),
      );
    });
    mockFetchResponse({ ok: true, body: buffer });

    const source = new UrlExcelEvidenceSource(WORKBOOK_URL);
    const result = await source.findAll();

    expect(fetchSpy).toHaveBeenCalledWith(WORKBOOK_URL);
    expect(result).toEqual([
      {
        evidenceId: 'EVD-0001',
        documentEvidence: 'Firewall Configuration Review',
        standards: [{ standard: 'ISMS', clauses: ['8.1'] }],
        location: 'United States',
        evidenceStatus: 'Accepted',
        complianceResult: 'Compliant',
        documentUrl: 'https://example.sharepoint.com/document.pdf',
      },
    ]);
  });

  it('parses a single standard with multiple clauses', async () => {
    const result = await runFindAllWithRow(
      buildRow({ standard: 'ISMS', clause: '7.2, 7.3' }),
    );

    expect(result[0].standards).toEqual([
      { standard: 'ISMS', clauses: ['7.2', '7.3'] },
    ]);
  });

  it('parses multiple standards with one clause each', async () => {
    const result = await runFindAllWithRow(
      buildRow({ standard: 'ISMS\nPIMS', clause: '8.1\n8.1' }),
    );

    expect(result[0].standards).toEqual([
      { standard: 'ISMS', clauses: ['8.1'] },
      { standard: 'PIMS', clauses: ['8.1'] },
    ]);
  });

  it('parses multiple standards with multiple clauses each', async () => {
    const result = await runFindAllWithRow(
      buildRow({
        standard: 'ISMS\nITSMS',
        clause: '6.1, 8.1\n8.1, 8.5',
      }),
    );

    expect(result[0].standards).toEqual([
      { standard: 'ISMS', clauses: ['6.1', '8.1'] },
      { standard: 'ITSMS', clauses: ['8.1', '8.5'] },
    ]);
  });

  it('parses standards separated by Windows-style \\r\\n line breaks', async () => {
    const result = await runFindAllWithRow(
      buildRow({ standard: 'ISMS\r\nPIMS', clause: '7.2\r\n7.2' }),
    );

    expect(result[0].standards).toEqual([
      { standard: 'ISMS', clauses: ['7.2'] },
      { standard: 'PIMS', clauses: ['7.2'] },
    ]);
  });

  it('trims extra whitespace around standards and clauses', async () => {
    const result = await runFindAllWithRow(
      buildRow({
        standard: '  ISMS \n PIMS  ',
        clause: ' 7.2 ,  7.3 \n 7.2 ',
      }),
    );

    expect(result[0].standards).toEqual([
      { standard: 'ISMS', clauses: ['7.2', '7.3'] },
      { standard: 'PIMS', clauses: ['7.2'] },
    ]);
  });

  it('ignores accidental empty lines in the Standard cell', async () => {
    const result = await runFindAllWithRow(
      buildRow({ standard: 'ISMS\nPIMS\n\n', clause: '7.2, 7.3\n7.2\n' }),
    );

    expect(result[0].standards).toEqual([
      { standard: 'ISMS', clauses: ['7.2', '7.3'] },
      { standard: 'PIMS', clauses: ['7.2'] },
    ]);
  });

  it('rejects an invalid standard value', async () => {
    await expect(
      runFindAllWithRow(buildRow({ standard: 'GDPR', clause: '8.1' })),
    ).rejects.toThrow(
      new InternalServerErrorException(
        "Invalid Standard 'GDPR' at Excel row 2.",
      ),
    );
  });

  it('detects a Standard/Clause line-count mismatch', async () => {
    await expect(
      runFindAllWithRow(
        buildRow({ standard: 'ISMS\nPIMS\nITSMS', clause: '7.2\n7.3' }),
      ),
    ).rejects.toThrow(
      new InternalServerErrorException(
        'Standard/Clause mapping mismatch at Excel row 2',
      ),
    );
  });

  it('rejects a duplicate Evidence ID', async () => {
    const buffer = await buildWorkbookBuffer((workbook) => {
      const sheet = workbook.addWorksheet('Evidence_Data');
      addHeaderRow(sheet);
      sheet.addRow(buildRow({ evidenceId: 'EVD-0001' }));
      sheet.addRow(
        buildRow({
          evidenceId: 'EVD-0001',
          documentEvidence: 'Another Document',
        }),
      );
    });
    mockFetchResponse({ ok: true, body: buffer });

    const source = new UrlExcelEvidenceSource(WORKBOOK_URL);

    await expect(source.findAll()).rejects.toThrow(
      new InternalServerErrorException(
        "Duplicate Evidence ID 'EVD-0001' at Excel row 3.",
      ),
    );
  });

  it('skips a completely empty row', async () => {
    const buffer = await buildWorkbookBuffer((workbook) => {
      const sheet = workbook.addWorksheet('Evidence_Data');
      addHeaderRow(sheet);
      sheet.addRow([]);
      sheet.addRow(
        buildRow({
          evidenceId: 'EVD-0002',
          documentEvidence: 'Access Control Policy',
        }),
      );
    });
    mockFetchResponse({ ok: true, body: buffer });

    const source = new UrlExcelEvidenceSource(WORKBOOK_URL);
    const result = await source.findAll();

    expect(result).toHaveLength(1);
    expect(result[0].documentEvidence).toBe('Access Control Policy');
  });

  it('reads the Document URL from a hyperlink cell', async () => {
    const buffer = await buildWorkbookBuffer((workbook) => {
      const sheet = workbook.addWorksheet('Evidence_Data');
      addHeaderRow(sheet);
      const row = sheet.addRow(buildRow({ documentUrl: undefined }));
      row.getCell(8).value = {
        text: 'document.pdf',
        hyperlink: 'https://example.sharepoint.com/document.pdf',
      };
    });
    mockFetchResponse({ ok: true, body: buffer });

    const source = new UrlExcelEvidenceSource(WORKBOOK_URL);
    const result = await source.findAll();

    expect(result[0].documentUrl).toBe(
      'https://example.sharepoint.com/document.pdf',
    );
  });

  it('requires an Evidence ID', async () => {
    await expect(
      runFindAllWithRow(buildRow({ evidenceId: '' })),
    ).rejects.toThrow(
      new InternalServerErrorException(
        'Evidence ID is required at Excel row 2.',
      ),
    );
  });

  it('requires a Document/Evidence value', async () => {
    await expect(
      runFindAllWithRow(buildRow({ documentEvidence: '' })),
    ).rejects.toThrow(
      new InternalServerErrorException(
        'Document/Evidence is required at Excel row 2.',
      ),
    );
  });

  it('requires a Standard value', async () => {
    await expect(runFindAllWithRow(buildRow({ standard: '' }))).rejects.toThrow(
      new InternalServerErrorException('Standard is required at Excel row 2.'),
    );
  });

  it('requires a Clause value', async () => {
    await expect(runFindAllWithRow(buildRow({ clause: '' }))).rejects.toThrow(
      new InternalServerErrorException('Clause is required at Excel row 2.'),
    );
  });

  it('requires a Location value', async () => {
    await expect(runFindAllWithRow(buildRow({ location: '' }))).rejects.toThrow(
      new InternalServerErrorException('Location is required at Excel row 2.'),
    );
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
        'Evidence ID',
        'Document/Evidence',
        'Standard',
        'Clause',
        'Location',
        'Evidence Status',
        'Compliance Result',
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

  it('detects an invalid Evidence Status', async () => {
    await expect(
      runFindAllWithRow(buildRow({ evidenceStatus: 'accept' })),
    ).rejects.toThrow(
      new InternalServerErrorException(
        "Invalid Evidence Status 'accept' at Excel row 2.",
      ),
    );
  });

  it('detects an invalid Compliance Result', async () => {
    await expect(
      runFindAllWithRow(buildRow({ complianceResult: 'yes' })),
    ).rejects.toThrow(
      new InternalServerErrorException(
        "Invalid Compliance Result 'yes' at Excel row 2.",
      ),
    );
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
