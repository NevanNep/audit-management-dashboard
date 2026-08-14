import { BadRequestException } from '@nestjs/common';
import {
  COMPLIANCE_RESULT_VALUES,
  ComplianceResultValue,
  EVIDENCE_STATUS_VALUES,
  EvidenceStatusValue,
  Standard,
  STANDARDS_VALUES,
} from './evidence.types';
import {
  EvidenceFilterParams,
  EvidenceQuery,
  SORT_KEY_VALUES,
  SortDirection,
  SortKey,
} from './evidence-query.util';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const DEFAULT_SORT_KEY: SortKey = 'documentId';
const DEFAULT_SORT_DIRECTION: SortDirection = 'asc';
const SORT_DIRECTION_VALUES: SortDirection[] = ['asc', 'desc'];

export interface RawEvidenceQuery {
  page?: string;
  pageSize?: string;
  search?: string;
  standard?: string;
  clause?: string;
  location?: string;
  evidenceStatus?: string;
  complianceResult?: string;
  overdue?: string;
  sortKey?: string;
  sortDirection?: string;
}

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  max: number,
  label: string,
): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestException(`${label} must be a positive integer.`);
  }
  return Math.min(parsed, max);
}

function parseEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  label: string,
): T | undefined {
  if (value === undefined || value === '') return undefined;
  if (!allowed.includes(value as T)) {
    throw new BadRequestException(`Invalid ${label} '${value}'.`);
  }
  return value as T;
}

export function parseFilterParams(raw: RawEvidenceQuery): EvidenceFilterParams {
  return {
    search: raw.search?.trim() || undefined,
    standard: parseEnum<Standard>(raw.standard, STANDARDS_VALUES, 'standard'),
    clause: raw.clause?.trim() || undefined,
    location: raw.location?.trim() || undefined,
    evidenceStatus: parseEnum<EvidenceStatusValue>(
      raw.evidenceStatus,
      EVIDENCE_STATUS_VALUES,
      'evidenceStatus',
    ),
    complianceResult: parseEnum<ComplianceResultValue>(
      raw.complianceResult,
      COMPLIANCE_RESULT_VALUES,
      'complianceResult',
    ),
    overdueOnly: raw.overdue === 'true' || undefined,
  };
}

export function parseEvidenceQuery(raw: RawEvidenceQuery): EvidenceQuery {
  return {
    ...parseFilterParams(raw),
    page: parsePositiveInt(raw.page, 1, Number.MAX_SAFE_INTEGER, 'page'),
    pageSize: parsePositiveInt(
      raw.pageSize,
      DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
      'pageSize',
    ),
    sortKey:
      parseEnum<SortKey>(raw.sortKey, SORT_KEY_VALUES, 'sortKey') ??
      DEFAULT_SORT_KEY,
    sortDirection:
      parseEnum<SortDirection>(
        raw.sortDirection,
        SORT_DIRECTION_VALUES,
        'sortDirection',
      ) ?? DEFAULT_SORT_DIRECTION,
  };
}
