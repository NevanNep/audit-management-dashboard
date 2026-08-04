import type { IsoCode } from '../types/evidence';

export interface IsoStandardMeta {
  code: IsoCode;
  shortName: string;
}

export const ISO_STANDARDS: IsoStandardMeta[] = [
  { code: 'ISO 27001', shortName: 'Information Security' },
  { code: 'ISO 27701', shortName: 'Privacy Information' },
  { code: 'ISO 20000', shortName: 'IT Service Mgmt' },
  { code: 'ISO 22301', shortName: 'Business Continuity' },
  { code: 'ISO 45001', shortName: 'Occupational H&S' },
  { code: 'ISO 37001', shortName: 'Anti-Bribery' },
  { code: 'ISO 50001', shortName: 'Energy Management' },
];
