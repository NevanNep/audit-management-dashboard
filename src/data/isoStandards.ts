import type { IsoCode } from '../types/evidence';

export interface IsoStandardMeta {
  code: IsoCode;
  shortName: string;
  standard: string;
}

export const ISO_STANDARDS: IsoStandardMeta[] = [
  { code: 'ISO 27001', shortName: 'Information Security', standard: 'ISMS' },
  { code: 'ISO 27701', shortName: 'Privacy Information', standard: 'PIMS' },
  { code: 'ISO 20000', shortName: 'IT Service Mgmt', standard: 'ITSMS' },
  { code: 'ISO 22301', shortName: 'Business Continuity', standard: 'BCMS' },
  { code: 'ISO 45001', shortName: 'Occupational H&S', standard: 'OHSMS' },
  { code: 'ISO 37001', shortName: 'Anti-Bribery', standard: 'ABMS' },
  { code: 'ISO 50001', shortName: 'Energy Management', standard: 'ENMS' },
];

const STANDARD_BY_ISO: Record<IsoCode, string> = Object.fromEntries(
  ISO_STANDARDS.map((std) => [std.code, std.standard])
) as Record<IsoCode, string>;

const ISO_BY_STANDARD: Record<string, IsoCode> = Object.fromEntries(
  ISO_STANDARDS.map((std) => [std.standard, std.code])
);

export function getStandardName(iso: IsoCode): string {
  return STANDARD_BY_ISO[iso];
}

export function getIsoCodeByStandard(standard: string): IsoCode | undefined {
  return ISO_BY_STANDARD[standard];
}
