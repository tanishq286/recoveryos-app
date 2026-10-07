import { ASSET_TYPES, type AssetType, type IdentifierKind } from "@/lib/types";

/**
 * Answers carried into the guided check from the home page's quick-scan bar
 * (`/check?asset=…&issuer=…&ref=…`). Plain GET params, so the bar works with
 * JavaScript off. Everything is re-validated by the check's own steps.
 */
export interface TriagePrefill {
  assetType: AssetType;
  issuerName: string | null;
  identifierKind: IdentifierKind | null;
  identifier: string | null;
}

/** The reference people usually have for each holding (the check's first option). */
export const PRIMARY_REFERENCE: Record<AssetType, { kind: IdentifierKind; label: string }> = {
  iepf_shares_dividends: { kind: "folio", label: "Folio number" },
  mutual_funds: { kind: "folio", label: "Folio number" },
  provident_fund: { kind: "uan", label: "UAN" },
  bank_deposits: { kind: "account_last4", label: "Last 4 digits of account" },
};

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

export function readTriagePrefill(
  query: Record<string, string | string[] | undefined>,
): TriagePrefill | null {
  const asset = one(query.asset);
  if (!(ASSET_TYPES as readonly string[]).includes(asset)) return null;
  const assetType = asset as AssetType;
  const issuer = one(query.issuer).slice(0, 120);
  const ref = one(query.ref).slice(0, 32);
  return {
    assetType,
    issuerName: issuer || null,
    identifierKind: ref ? PRIMARY_REFERENCE[assetType].kind : null,
    identifier: ref || null,
  };
}
