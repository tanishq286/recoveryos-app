import "server-only";

import { REFERENCE_COMPANIES, RTA_LABELS, referenceCompanyBySlug } from "@recoveryos/shared";

import { apiOrNull } from "@/lib/api/server";
import type { CompanyDetail, CompanyListItem } from "@/lib/api/types";

/**
 * Company data for the public guides, read from the API (revalidated every
 * 15 minutes, matching the price sync). If the API is unreachable, for
 * example during a build without it, the verified catalogue stands in: same
 * contacts and corporate actions, and no price rather than a stale one.
 */
const REVALIDATE = 900;

export async function listCompanies(): Promise<CompanyListItem[]> {
  const live = await apiOrNull<CompanyListItem[]>("companies", { revalidate: REVALIDATE });
  if (live) return live;
  return REFERENCE_COMPANIES.map((c) => ({
    slug: c.slug,
    name: c.name,
    sector: c.sector,
    tickerNse: c.tickerNse,
    rtaName: c.rta,
    rtaLabel: c.rtaDisplayName ?? RTA_LABELS[c.rta],
    currentMarketPrice: null,
    priceUpdatedAt: null,
    folioCount: 0,
    updatedAt: null,
  }));
}

export async function getCompany(slug: string): Promise<CompanyDetail | null> {
  const live = await apiOrNull<CompanyDetail>(`companies/${encodeURIComponent(slug)}`, { revalidate: REVALIDATE });
  if (live) return live;
  const c = referenceCompanyBySlug(slug);
  if (!c) return null;
  return {
    slug: c.slug,
    name: c.name,
    cin: c.cin,
    statutoryBasis: c.statutoryBasis,
    isin: c.isin,
    sector: c.sector,
    tickerNse: c.tickerNse,
    tickerBse: c.tickerBse,
    currentMarketPrice: null,
    priceUpdatedAt: null,
    priceSource: null,
    rta: { name: c.rta, label: c.rtaDisplayName, address: c.rtaAddress, email: c.rtaEmail, phone: c.rtaPhone, website: c.rtaWebsite },
    nodalOfficer: {
      name: c.nodalOfficer.name,
      emails: c.nodalOfficer.emails,
      phone: c.nodalOfficer.phone,
      address: c.nodalOfficer.address,
      deputies: c.deputyNodalOfficers,
    },
    contacts: { source: c.contactsSource, verifiedAt: `${c.contactsVerifiedOn}T12:00:00+05:30` },
    irPageUrl: c.irPageUrl,
    corporateActions: c.actions.map((a) => ({
      actionType: a.actionType,
      exDate: a.exDate,
      ratioFrom: a.ratioFrom ?? null,
      ratioTo: a.ratioTo ?? null,
      dividendPerShare: a.dividendPerShare ?? null,
      notes: a.notes ?? null,
      source: a.source ?? null,
    })),
    records: [],
  };
}
