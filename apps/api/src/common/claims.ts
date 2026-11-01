import type { Prisma } from "@finsol/db";

/**
 * Competing claims on holder records. A verified mobile number proves control
 * of that number, not ownership of a holding, and a name or record-group hash
 * is not identity either. So whenever two different people ask for the same
 * record, both requests go to review, and nothing about one claimant is ever
 * shown to the other.
 */

type Tx = Prisma.TransactionClient;

/**
 * Serialises work on these holder records for the rest of the transaction
 * (transaction-scoped advisory locks work through PgBouncer's transaction
 * pooling, unlike session locks). Sorted to avoid deadlocks.
 */
export async function lockFolios(tx: Tx, folioIds: readonly string[]) {
  for (const id of [...new Set(folioIds)].sort())
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`folio:${id}`}, 0))`;
}

export interface CompetingClaims {
  /** Cases on these records belonging to someone other than `phone`. */
  cases: { id: string; caseCode: string; folioId: string | null }[];
  /** Open leads on these records from a different phone. */
  leads: { id: string }[];
}

/** Other people's cases and open requests on these records. */
export async function competingClaims(
  tx: Tx,
  folioIds: readonly string[],
  phone: string,
): Promise<CompetingClaims> {
  const ids = [...new Set(folioIds)];
  const [cases, leads] = await Promise.all([
    tx.recoveryCase.findMany({
      where: { folioId: { in: ids }, client: { phone: { not: phone } } },
      select: { id: true, caseCode: true, folioId: true },
    }),
    tx.leadInquiry.findMany({
      where: {
        phone: { not: phone },
        matchedFolioIds: { hasSome: ids },
        crmStage: { not: "CONVERTED_TO_CASE" },
      },
      select: { id: true },
    }),
  ]);
  return { cases, leads };
}

export const isContested = (c: CompetingClaims) => c.cases.length > 0 || c.leads.length > 0;
