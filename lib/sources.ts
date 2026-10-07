import type { AssetType, SelfServiceLink } from "@/lib/types";

/**
 * Official, free, self-service routes. Shown beside our paid help everywhere,
 * so nobody has to pay us to do something they can do themselves.
 */
export const OFFICIAL_LINKS = {
  iepfSearch: {
    label: "IEPF Authority: search unclaimed shares and dividends",
    href: "https://www.iepf.gov.in",
    note: "Free. Search by the holder's name and the company.",
  },
  mcaIepf5: {
    label: "MCA portal: file Form IEPF-5 yourself",
    href: "https://www.mca.gov.in",
    note: "No government filing fee for IEPF-5.",
  },
  sebiScores: {
    label: "SEBI SCORES: complain about a listed company or registrar",
    href: "https://scores.sebi.gov.in",
    note: "Free. Use it if a company or RTA does not respond.",
  },
  mfCentral: {
    label: "MF Central: find mutual fund folios",
    href: "https://www.mfcentral.com",
    note: "Free. Run by the two registrars, CAMS and KFintech.",
  },
  epfo: {
    label: "EPFO member portal: PF passbook and claims",
    href: "https://unifiedportal-mem.epfindia.gov.in",
    note: "Free. Needs your own UAN login.",
  },
  udgam: {
    label: "RBI UDGAM: search unclaimed bank deposits",
    href: "https://udgam.rbi.org.in",
    note: "Free. Search several banks at once.",
  },
  cybercrime: {
    label: "National Cyber Crime Reporting Portal",
    href: "https://cybercrime.gov.in",
    note: "Report fraud online, or call 1930.",
  },
} satisfies Record<string, SelfServiceLink>;

export interface SourceDirectoryEntry {
  id: string;
  sourceName: string;
  operator: string;
  url: string | null;
  assetTypes: AssetType[];
  /** What we would need from you to query it. */
  needs: ("issuer" | "holder_name" | "identifier" | "your_login")[];
  /** Is a live connector wired up in this build? */
  liveConnector: boolean;
}

/**
 * Registries a check can touch. In this build no live connector is wired up,
 * so every registry reports "not connected" rather than a made-up result.
 */
export const SOURCE_DIRECTORY: SourceDirectoryEntry[] = [
  {
    id: "iepf_search",
    sourceName: "Unclaimed shares and dividends search",
    operator: "IEPF Authority, Ministry of Corporate Affairs",
    url: OFFICIAL_LINKS.iepfSearch.href,
    assetTypes: ["iepf_shares_dividends"],
    needs: ["holder_name", "issuer"],
    liveConnector: false,
  },
  {
    id: "company_unpaid_list",
    sourceName: "Company's unpaid dividend list",
    operator: "Published by each company on its investor page",
    url: null,
    assetTypes: ["iepf_shares_dividends"],
    needs: ["issuer"],
    liveConnector: false,
  },
  {
    id: "mf_central",
    sourceName: "Folio search",
    operator: "MF Central (CAMS and KFintech)",
    url: OFFICIAL_LINKS.mfCentral.href,
    assetTypes: ["mutual_funds"],
    needs: ["your_login"],
    liveConnector: false,
  },
  {
    id: "epfo_passbook",
    sourceName: "Member passbook",
    operator: "Employees' Provident Fund Organisation",
    url: OFFICIAL_LINKS.epfo.href,
    assetTypes: ["provident_fund"],
    needs: ["your_login"],
    liveConnector: false,
  },
  {
    id: "rbi_udgam",
    sourceName: "UDGAM unclaimed deposits search",
    operator: "Reserve Bank of India",
    url: OFFICIAL_LINKS.udgam.href,
    assetTypes: ["bank_deposits"],
    needs: ["holder_name", "your_login"],
    liveConnector: false,
  },
];
