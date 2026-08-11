import { InternalServerErrorException } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Cell, Workbook, Worksheet } from 'exceljs';
import {
  COMPLIANCE_RESULT_VALUES,
  EVIDENCE_STATUS_VALUES,
  Evidence,
  STANDARDS_VALUES,
} from '../evidence.types';
import { EvidenceSource } from './evidence-source.interface';

const DEFAULT_WORKBOOK_PATH = join(
  'data',
  'audit_dashboard_excel_simulation_revised.xlsx',
);
const WORKSHEET_NAME = 'Evidence_Data';
const HEADER_ROW_NUMBER = 1;

type EvidenceField = keyof Evidence;

interface HeaderDefinition {
  header: string;
  field: EvidenceField;
}

const REQUIRED_HEADERS: HeaderDefinition[] = [
  { header: 'Document ID', field: 'documentId' },
  { header: 'Document', field: 'document' },
  { header: 'Standards', field: 'standards' },
  { header: 'Clause', field: 'clause' },
  { header: 'Location', field: 'location' },
  { header: 'Evidence status', field: 'evidenceStatus' },
  { header: 'Compliance result', field: 'complianceResult' },
  { header: 'Due date', field: 'dueDate' },
  { header: 'Document URL', field: 'documentUrl' },
];

type HeaderColumnMap = Record<EvidenceField, number>;

const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class LocalExcelEvidenceSource implements EvidenceSource {
  constructor(
    private readonly workbookPath: string = join(
      process.cwd(),
      DEFAULT_WORKBOOK_PATH,
    ),
  ) {}

  async findAll(): Promise<Evidence[]> {
    const worksheet = await this.loadWorksheet();
    const headerMap = this.buildHeaderMap(worksheet);
    const evidences: Evidence[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === HEADER_ROW_NUMBER) {
        return;
      }

      const documentText = this.cellToText(row.getCell(headerMap.document));
      if (!documentText) {
        return;
      }

      const documentId = this.cellToText(row.getCell(headerMap.documentId));
      const standards = this.validateEnum(
        this.cellToText(row.getCell(headerMap.standards)),
        STANDARDS_VALUES,
        'Standards',
        rowNumber,
      );
      const clause = this.cellToText(row.getCell(headerMap.clause));
      const location = this.cellToText(row.getCell(headerMap.location));
      const evidenceStatus = this.validateEnum(
        this.cellToText(row.getCell(headerMap.evidenceStatus)),
        EVIDENCE_STATUS_VALUES,
        'Evidence status',
        rowNumber,
      );
      const complianceResult = this.validateEnum(
        this.cellToText(row.getCell(headerMap.complianceResult)),
        COMPLIANCE_RESULT_VALUES,
        'Compliance result',
        rowNumber,
      );
      const dueDate = this.parseDueDate(
        row.getCell(headerMap.dueDate),
        rowNumber,
      );
      const documentUrl = this.getDocumentUrl(
        row.getCell(headerMap.documentUrl),
      );

      evidences.push({
        documentId,
        document: documentText,
        standards,
        clause,
        location,
        evidenceStatus,
        complianceResult,
        dueDate,
        documentUrl,
      });
    });

    return evidences;
  }

  private async loadWorksheet(): Promise<Worksheet> {
    if (!existsSync(this.workbookPath)) {
      throw new InternalServerErrorException(
        'Excel evidence file was not found.',
      );
    }

    const workbook = new Workbook();
    try {
      await workbook.xlsx.readFile(this.workbookPath);
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
    for (const { header, field } of REQUIRED_HEADERS) {
      const colNumber = normalizedHeaders.get(header.toLowerCase());
      if (colNumber === undefined) {
        throw new InternalServerErrorException(
          `Required Excel header '${header}' was not found.`,
        );
      }
      headerMap[field] = colNumber;
    }

    return headerMap;
  }

  private validateEnum(
    value: string,
    allowedValues: readonly string[],
    headerLabel: string,
    rowNumber: number,
  ): string {
    if (!allowedValues.includes(value)) {
      throw new InternalServerErrorException(
        `Invalid ${headerLabel} '${value}' at Excel row ${rowNumber}.`,
      );
    }
    return value;
  }

  private parseDueDate(cell: Cell, rowNumber: number): string {
    const value = cell.value;

    if (value instanceof Date) {
      return this.formatUtcDate(value);
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return this.formatUtcDate(this.excelSerialToDate(value));
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (ISO_DATE_PATTERN.test(trimmed)) {
        return trimmed;
      }
    }

    throw new InternalServerErrorException(
      `Invalid Due date at Excel row ${rowNumber}.`,
    );
  }

  private formatUtcDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private excelSerialToDate(serial: number): Date {
    return new Date(EXCEL_EPOCH_UTC_MS + Math.round(serial * MS_PER_DAY));
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
      return this.formatUtcDate(value);
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
          return this.formatUtcDate(result);
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
