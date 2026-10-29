import type { RtaName } from "../enums.js";

export interface RtaDirectoryEntry {
  rta: RtaName;
  legalName: string;
  address: string;
  website: string | null;
}

/**
 * Registrar head offices. Compiled for this build from public sources;
 * registrars move and rename (Link Intime now trades as MUFG Intime), so
 * every page that shows an address also tells people to confirm it first.
 */
export const RTA_DIRECTORY: Record<RtaName, RtaDirectoryEntry> = {
  KFIN: {
    rta: "KFIN",
    legalName: "KFin Technologies Limited",
    address:
      "Selenium Tower B, Plot 31-32, Gachibowli, Financial District, Nanakramguda, Serilingampally, Hyderabad, Telangana 500032",
    website: "https://www.kfintech.com",
  },
  LINK_INTIME: {
    rta: "LINK_INTIME",
    legalName: "MUFG Intime India Private Limited (formerly Link Intime India)",
    address: "C-101, 247 Park, L.B.S. Marg, Vikhroli (West), Mumbai, Maharashtra 400083",
    website: "https://in.mpms.mufg.com",
  },
  BIGSHARE: {
    rta: "BIGSHARE",
    legalName: "Bigshare Services Private Limited",
    address:
      "Office S6-2, 6th Floor, Pinnacle Business Park, next to Ahura Centre, Mahakali Caves Road, Andheri (East), Mumbai, Maharashtra 400093",
    website: "https://www.bigshareonline.com",
  },
  ALANKIT: {
    rta: "ALANKIT",
    legalName: "Alankit Assignments Limited",
    address: "Alankit House, 4E/2 Jhandewalan Extension, New Delhi 110055",
    website: "https://www.alankit.com",
  },
  INTEGRATED: {
    rta: "INTEGRATED",
    legalName: "Integrated Registry Management Services Private Limited",
    address:
      "2nd Floor, Kences Towers, 1 Ramakrishna Street, North Usman Road, T. Nagar, Chennai, Tamil Nadu 600017",
    website: "https://www.integratedregistry.in",
  },
  DATAMATICS: {
    rta: "DATAMATICS",
    legalName: "Datamatics Business Solutions Limited",
    address: "Plot B-5, Part B Crosslane, MIDC, Marol, Andheri (East), Mumbai, Maharashtra 400093",
    website: "https://www.datamaticsbpm.com",
  },
  CAMEO: {
    rta: "CAMEO",
    legalName: "Cameo Corporate Services Limited",
    address: "Subramanian Building, 1 Club House Road, Chennai, Tamil Nadu 600002",
    website: "https://cameoindia.com",
  },
  IN_HOUSE: {
    rta: "IN_HOUSE",
    legalName: "The company's own investor service centre",
    address: "See the company's investor relations page.",
    website: null,
  },
  OTHER: {
    rta: "OTHER",
    legalName: "Registrar on record",
    address: "See the company's investor relations page.",
    website: null,
  },
};
