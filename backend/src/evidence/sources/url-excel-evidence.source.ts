import { InternalServerErrorException } from '@nestjs/common';
import { Cell, Workbook, Worksheet } from 'exceljs';
import {
  Evidence,
  EvidenceStandard,
  COMPLIANCE_RESULT_VALUES,
  EVIDENCE_STATUS_VALUES,
  STANDARDS_VALUES,
} from '../evidence.types';
import { EvidenceSource } from './evidence-source.interface';

const WORKSHEET_NAME = 'Evidence_Data';
const HEADER_ROW_NUMBER = 1;
const LINE_BREAK_PATTERN = /\r\n|\n/;

type ExcelColumn =
  | 'evidenceId'
  | 'documentEvidence'
  | 'standard'
  | 'clause'
  | 'location'
  | 'evidenceStatus'
  | 'complianceResult'
  | 'documentUrl';

interface HeaderDefinition {
  header: string;
  column: ExcelColumn;
}

const REQUIRED_HEADERS: HeaderDefinition[] = [
  { header: 'Evidence ID', column: 'evidenceId' },
  { header: 'Document/Evidence', column: 'documentEvidence' },
  { header: 'Standard', column: 'standard' },
  { header: 'Clause', column: 'clause' },
  { header: 'Location', column: 'location' },
  { header: 'Evidence Status', column: 'evidenceStatus' },
  { header: 'Compliance Result', column: 'complianceResult' },
  { header: 'Document URL', column: 'documentUrl' },
];

type HeaderColumnMap = Record<ExcelColumn, number>;

const EXCEL_COLUMNS: ExcelColumn[] = REQUIRED_HEADERS.map((h) => h.column);

const formatUtcDate = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export class UrlExcelEvidenceSource implements EvidenceSource {
  constructor(
    private readonly workbookUrl: string | undefined = process.env
      .EVIDENCE_WORKBOOK_URL,
  ) {}

  async findAll(): Promise<Evidence[]> {
    const worksheet = await this.loadWorksheet();
    const headerMap = this.buildHeaderMap(worksheet);
    const evidences: Evidence[] = [];
    const seenEvidenceIds = new Set<string>();

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === HEADER_ROW_NUMBER) {
        return;
      }

      const cellText = (column: ExcelColumn): string =>
        this.cellToText(row.getCell(headerMap[column]));

      const isEmptyRow = EXCEL_COLUMNS.every(
        (column) => cellText(column).length === 0,
      );
      if (isEmptyRow) {
        return;
      }

      const evidenceId = this.requireText(
        cellText('evidenceId'),
        'Evidence ID',
        rowNumber,
      );

      if (seenEvidenceIds.has(evidenceId)) {
        throw new InternalServerErrorException(
          `Duplicate Evidence ID '${evidenceId}' at Excel row ${rowNumber}.`,
        );
      }
      seenEvidenceIds.add(evidenceId);

      const documentEvidence = this.requireText(
        cellText('documentEvidence'),
        'Document/Evidence',
        rowNumber,
      );
      const standardText = this.requireText(
        cellText('standard'),
        'Standard',
        rowNumber,
      );
      const clauseText = this.requireText(
        cellText('clause'),
        'Clause',
        rowNumber,
      );
      const standards = this.parseStandards(
        standardText,
        clauseText,
        rowNumber,
      );
      const location = this.requireText(
        cellText('location'),
        'Location',
        rowNumber,
      );
      const evidenceStatus = this.validateEnum(
        cellText('evidenceStatus'),
        EVIDENCE_STATUS_VALUES,
        'Evidence Status',
        rowNumber,
      );
      const complianceResult = this.validateEnum(
        cellText('complianceResult'),
        COMPLIANCE_RESULT_VALUES,
        'Compliance Result',
        rowNumber,
      );
      const documentUrl = this.getDocumentUrl(
        row.getCell(headerMap.documentUrl),
      );

      evidences.push({
        evidenceId,
        documentEvidence,
        standards,
        location,
        evidenceStatus,
        complianceResult,
        documentUrl,
      });
    });

    return evidences;
  }

  private async loadWorksheet(): Promise<Worksheet> {
    if (!this.workbookUrl) {
      throw new InternalServerErrorException(
        'EVIDENCE_WORKBOOK_URL is not configured.',
      );
    }

    let response: Response;
    try {
      response = await fetch(this.workbookUrl);
    } catch {
      throw new InternalServerErrorException(
        'Excel evidence file could not be downloaded.',
      );
    }

    if (!response.ok) {
      throw new InternalServerErrorException(
        `Excel evidence file could not be downloaded (status ${response.status}).`,
      );
    }

    const workbook = new Workbook();
    try {
      // exceljs's ambient Buffer type conflicts with @types/node's generic
      // Buffer, so the downloaded bytes are passed through as `any`.
      const buffer: any = Buffer.from(await response.arrayBuffer());
      await workbook.xlsx.load(buffer);
    } catch {
      throw new InternalServerErrorException(
        'Excel evidence file could not be read.',
      );
    }

    const worksheet = workbook.getWorksheet(WORKSHEET_NAME);
    if (!worksheet) {
      throw new InternalServerErrorException(
        `Worksheet ${WORKSHEET_NAME} was not found.`,
      );
    }

    return worksheet;
  }

  private buildHeaderMap(worksheet: Worksheet): HeaderColumnMap {
    const headerRow = worksheet.getRow(HEADER_ROW_NUMBER);
    const normalizedHeaders = new Map<string, number>();

    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = this.cellToText(cell).toLowerCase();
      if (text) {
        normalizedHeaders.set(text, colNumber);
      }
    });

    const headerMap = {} as HeaderColumnMap;
    for (const { header, column } of REQUIRED_HEADERS) {
      const colNumber = normalizedHeaders.get(header.toLowerCase());
      if (colNumber === undefined) {
        throw new InternalServerErrorException(
          `Required Excel header '${header}' was not found.`,
        );
      }
      headerMap[column] = colNumber;
    }

    return headerMap;
  }

  private requireText(
    value: string,
    headerLabel: string,
    rowNumber: number,
  ): string {
    if (!value) {
      throw new InternalServerErrorException(
        `${headerLabel} is required at Excel row ${rowNumber}.`,
      );
    }
    return value;
  }

  private parseStandards(
    standardText: string,
    clauseText: string,
    rowNumber: number,
  ): EvidenceStandard[] {
    const standardLines = this.splitNonEmptyLines(standardText);
    const clauseLines = this.splitNonEmptyLines(clauseText);

    if (standardLines.length !== clauseLines.length) {
      throw new InternalServerErrorException(
        `Standard/Clause mapping mismatch at Excel row ${rowNumber}`,
      );
    }

    return standardLines.map((standardValue, index) => {
      const standard = this.validateEnum(
        standardValue,
        STANDARDS_VALUES,
        'Standard',
        rowNumber,
      );

      const clauses = clauseLines[index]
        .split(',')
        .map((clause) => clause.trim())
        .filter((clause) => clause.length > 0);

      return { standard, clauses };
    });
  }

  private splitNonEmptyLines(text: string): string[] {
    return text
      .split(LINE_BREAK_PATTERN)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  private validateEnum<T extends string>(
    value: string,
    allowedValues: readonly T[],
    headerLabel: string,
    rowNumber: number,
  ): T {
    if (!allowedValues.includes(value as T)) {
      throw new InternalServerErrorException(
        `Invalid ${headerLabel} '${value}' at Excel row ${rowNumber}.`,
      );
    }
    return value as T;
  }

  private getDocumentUrl(cell: Cell): string {
    const value = cell.value;
    if (value && typeof value === 'object' && 'hyperlink' in value) {
      return String(value.hyperlink ?? '').trim();
    }
    return this.cellToText(cell);
  }

  private cellToText(cell: Cell): string {
    const value = cell.value;

    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value).trim();
    }
    if (value instanceof Date) {
      return formatUtcDate(value);
    }
    if (typeof value === 'object') {
      if ('richText' in value && Array.isArray(value.richText)) {
        return value.richText
          .map((run) => run.text)
          .join('')
          .trim();
      }
      if ('text' in value && typeof value.text === 'string') {
        return value.text.trim();
      }
      if ('result' in value) {
        const { result } = value;
        if (result === null || result === undefined) {
          return '';
        }
        if (result instanceof Date) {
          return formatUtcDate(result);
        }
        if (typeof result === 'object') {
          return result.error;
        }
        return String(result).trim();
      }
    }

    return '';
  }
}
