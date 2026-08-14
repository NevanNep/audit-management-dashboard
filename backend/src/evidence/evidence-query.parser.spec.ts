import { BadRequestException } from '@nestjs/common';
import { parseEvidenceQuery, parseFilterParams } from './evidence-query.parser';

describe('parseEvidenceQuery', () => {
  it('applies defaults when no query params are given', () => {
    const query = parseEvidenceQuery({});

    expect(query).toMatchObject({
      page: 1,
      pageSize: 10,
      sortKey: 'documentId',
      sortDirection: 'asc',
    });
  });

  it('parses and clamps pageSize to the maximum', () => {
    const query = parseEvidenceQuery({ pageSize: '500' });
    expect(query.pageSize).toBe(100);
  });

  it('rejects a non-integer page', () => {
    expect(() => parseEvidenceQuery({ page: 'two' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects an unknown sortKey', () => {
    expect(() => parseEvidenceQuery({ sortKey: 'bogus' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects an invalid standard', () => {
    expect(() => parseFilterParams({ standard: 'GDPR' })).toThrow(
      BadRequestException,
    );
  });

  it('passes through a valid standard and trims search', () => {
    const filters = parseFilterParams({
      standard: 'ISMS',
      search: '  audit  ',
    });
    expect(filters.standard).toBe('ISMS');
    expect(filters.search).toBe('audit');
  });
});
