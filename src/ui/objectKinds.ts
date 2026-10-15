export const OBJECT_KINDS = [
  'parcel',
  'coffee',
  'ticket',
  'books',
  'umbrella',
  'car',
  'boba',
] as const;
export type ObjectKind = (typeof OBJECT_KINDS)[number];
