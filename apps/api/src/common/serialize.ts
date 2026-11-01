/** Prisma Decimal / BigInt / null to plain JSON numbers. */
export const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
export const numOrNull = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);
export const isoDate = (d: Date | null | undefined): string | null =>
  d ? d.toISOString().slice(0, 10) : null;
export const isoTime = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);
