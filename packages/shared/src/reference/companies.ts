import type { CorporateActionLike } from "../corporate-actions.js";
import type { RtaName } from "../enums.js";
import { RTA_DIRECTORY } from "./rtas.js";

export interface NodalContact {
  name: string;
  emails: string[];
  phone: string | null;
  address: string | null;
}

export interface ReferenceCompany {
  slug: string;
  name: string;
  /** Corporate Identity Number. Null for statutory bodies, which have none (see statutoryBasis). */
  cin: string | null;
  /** For bodies set up by statute rather than incorporated under the Companies Act. */
  statutoryBasis: string | null;
  isin: string | null;
  sector: string;
  tickerNse: string | null;
  tickerBse: string | null;
  rta: RtaName;
  /** The registrar as the company names it, e.g. "ITC In-House Investor Service Centre". */
  rtaDisplayName: string;
  rtaAddress: string | null;
  rtaEmail: string | null;
  rtaPhone: string | null;
  rtaWebsite: string | null;
  nodalOfficer: NodalContact;
  deputyNodalOfficers: { name: string; email: string | null }[];
  /** Investor-relations page that lists IEPF / unclaimed dividend statements, for the fetcher. */
  irPageUrl: string | null;
  contactsSource: string;
  /** YYYY-MM-DD the contacts were last checked. */
  contactsVerifiedOn: string;
  actions: CorporateActionLike[];
}

/**
 * The company catalogue. Nodal officer, registrar and identifier details were
 * supplied by the RecoveryOS operations team from each company's investor
 * disclosures and recorded on the date below. There are no prices here:
 * they come from the live market sync (apps/api/src/market).
 *
 * Corporate actions carry their source. Bonus and split dates were checked
 * against the exchange split history Yahoo Finance republishes. Where that
 * history records a combined split and bonus as one ratio, the company's
 * announced components are kept (noted per action).
 */
export const CONTACTS_SOURCE =
  "RecoveryOS operations, from the company's investor-relations and IEPF disclosures";
const VERIFIED_ON = "2026-10-29";

const EXCHANGE = "Exchange split history (via Yahoo Finance)";
const ANNOUNCED = "Company announcement";

const bonus = (exDate: string, ratioFrom: number, ratioTo: number, source = EXCHANGE, notes?: string): CorporateActionLike => ({
  actionType: "BONUS",
  exDate,
  ratioFrom,
  ratioTo,
  notes: notes ?? `Bonus ${ratioTo}:${ratioFrom}`,
  source,
});
const split = (exDate: string, ratioFrom: number, ratioTo: number, source = EXCHANGE, notes?: string): CorporateActionLike => ({
  actionType: "SPLIT",
  exDate,
  ratioFrom,
  ratioTo,
  notes: notes ?? `Face value ₹${ratioFrom} to ₹${ratioTo}`,
  source,
});

const emails = (s: string) => s.split("/").map((e) => e.trim()).filter(Boolean);

function company(
  c: Omit<ReferenceCompany, "rtaAddress" | "rtaWebsite" | "contactsSource" | "contactsVerifiedOn" | "deputyNodalOfficers" | "irPageUrl" | "statutoryBasis" | "rtaEmail" | "rtaPhone"> &
    Partial<Pick<ReferenceCompany, "rtaAddress" | "rtaWebsite" | "deputyNodalOfficers" | "irPageUrl" | "statutoryBasis" | "rtaEmail" | "rtaPhone">>,
): ReferenceCompany {
  const dir = RTA_DIRECTORY[c.rta];
  return {
    statutoryBasis: null,
    rtaEmail: null,
    rtaPhone: null,
    deputyNodalOfficers: [],
    irPageUrl: null,
    contactsSource: CONTACTS_SOURCE,
    contactsVerifiedOn: VERIFIED_ON,
    ...c,
    rtaAddress: c.rtaAddress ?? (c.rta === "IN_HOUSE" || c.rta === "OTHER" ? null : `${dir.legalName}, ${dir.address}`),
    rtaWebsite: c.rtaWebsite ?? dir.website,
  };
}

export const REFERENCE_COMPANIES: ReferenceCompany[] = [
  company({
    slug: "reliance-industries-limited",
    name: "Reliance Industries Limited",
    cin: "L17110MH1973PLC019786",
    isin: "INE002A01018",
    sector: "Oil, gas, retail and telecom",
    tickerNse: "RELIANCE",
    tickerBse: "500325",
    rta: "KFIN",
    rtaDisplayName: "KFin Technologies Limited",
    rtaAddress: "KFin Technologies Limited, Selenium Tower B, Plot 31-32, Gachibowli, Financial District, Nanakramguda, Hyderabad - 500032",
    rtaEmail: "rilinvestor@kfintech.com",
    rtaPhone: "1800 309 4001 (toll-free)",
    nodalOfficer: {
      name: "Smt. Savithri Parekh (Company Secretary & Compliance Officer)",
      emails: ["savithri.parekh@ril.com"],
      phone: null,
      address: "3rd Floor, Maker Chambers IV, 222, Nariman Point, Mumbai - 400021",
    },
    deputyNodalOfficers: [
      { name: "Shri Venugopal Siva Prasad", email: "sp.venugopal@ril.com" },
      { name: "Shri Vivin Mally", email: "vivin.mally@ril.com" },
    ],
    irPageUrl: "https://www.ril.com/investors/shares/dividend-shares",
    actions: [bonus("1997-10-27", 1, 1), bonus("2009-11-26", 1, 1), bonus("2017-09-07", 1, 1), bonus("2024-10-28", 1, 1)],
  }),
  company({
    slug: "tata-consultancy-services-limited",
    name: "Tata Consultancy Services Limited",
    cin: "L22210MH1995PLC084781",
    isin: "INE467B01029",
    sector: "Information technology",
    tickerNse: "TCS",
    tickerBse: "532540",
    rta: "LINK_INTIME",
    rtaDisplayName: "MUFG Intime India Private Limited",
    rtaPhone: "+91 810 811 8484",
    rtaWebsite: "https://tcpl.linkintime.co.in/",
    nodalOfficer: {
      name: "Yashaswin Narendra Sheth (Company Secretary)",
      emails: ["yn.sheth@tcs.com"],
      phone: null,
      address: "9th Floor, Nirmal Building, Nariman Point, Mumbai - 400021",
    },
    actions: [bonus("2006-07-28", 1, 1), bonus("2009-06-16", 1, 1), bonus("2018-05-31", 1, 1)],
  }),
  company({
    slug: "state-bank-of-india",
    name: "State Bank of India",
    cin: null,
    statutoryBasis: "Constituted under the State Bank of India Act, 1955 (no CIN)",
    isin: "INE062A01020",
    sector: "Banking",
    tickerNse: "SBIN",
    tickerBse: "500112",
    rta: "ALANKIT",
    rtaDisplayName: "Alankit Assignments Limited",
    nodalOfficer: {
      name: "Shri Dewesh Kumar Verma (Deputy General Manager - Shares & Bonds)",
      emails: ["dgm.snb@sbi.co.in"],
      phone: "022-22741480 / Senior citizen helpline: 022-22740844",
      address: "Shares & Bonds Dept, 14th Floor, State Bank Bhawan, Madame Cama Road, Nariman Point, Mumbai - 400021",
    },
    actions: [split("2014-11-20", 10, 1)],
  }),
  company({
    slug: "hindustan-unilever-limited",
    name: "Hindustan Unilever Limited",
    cin: "L15140MH1933PLC002030",
    isin: "INE030A01027",
    sector: "Consumer goods",
    tickerNse: "HINDUNILVR",
    tickerBse: "500696",
    rta: "KFIN",
    rtaDisplayName: "KFin Technologies Limited",
    nodalOfficer: {
      name: "Ms. Radhika Shah (Company Secretary & Compliance Officer)",
      emails: ["HUL.CompanySecretary@unilever.com"],
      phone: null,
      address: "Unilever House, B. D. Sawant Marg, Chakala, Andheri (E), Mumbai - 400099",
    },
    deputyNodalOfficers: [{ name: "Ms. Uma Rajagopalan", email: "HUL.IEPF@unilever.com" }],
    actions: [split("2000-07-10", 10, 1)],
  }),
  company({
    slug: "wipro-limited",
    name: "Wipro Limited",
    cin: "L32102KA1945PLC020800",
    isin: "INE075A01022",
    sector: "Information technology",
    tickerNse: "WIPRO",
    tickerBse: "507685",
    rta: "KFIN",
    rtaDisplayName: "KFin Technologies Limited",
    nodalOfficer: {
      name: "Mr. M Sanaulla Khan (Company Secretary)",
      emails: emails("sanaulla.khan@wipro.com / iepf.nodalofficer@wipro.com"),
      phone: "+91 80 28440011",
      address: "Doddakannelli, Sarjapur Road, Bengaluru - 560035",
    },
    actions: [
      bonus("1997-10-20", 1, 2),
      split("1999-09-27", 10, 2),
      bonus("2004-06-25", 1, 2),
      bonus("2005-08-22", 1, 1),
      bonus("2010-06-15", 3, 2),
      bonus("2017-06-13", 1, 1),
      bonus("2019-03-06", 3, 1),
      bonus("2024-12-03", 1, 1),
    ],
  }),
  company({
    slug: "bajaj-finance-limited",
    name: "Bajaj Finance Limited",
    cin: "L65910MH1987PLC042961",
    isin: "INE296A01024",
    sector: "Non-banking finance",
    tickerNse: "BAJFINANCE",
    tickerBse: "500034",
    rta: "KFIN",
    rtaDisplayName: "KFin Technologies Limited",
    rtaEmail: "einward.ris@kfintech.com",
    nodalOfficer: {
      name: "R. Vijay (Company Secretary)",
      emails: emails("Vijay.r@bajajfinserv.in / investor.service@bajajfinserv.in"),
      phone: null,
      address: "3rd Floor, Panchshil Tech Park, Viman Nagar, Pune - 411014",
    },
    deputyNodalOfficers: [
      { name: "Ravi Kumar Dugar", email: "Ravikumar.dugar@bajajfinserv.in" },
      { name: "Elangovan S", email: "elangovan.s@bajajfinserv.in" },
    ],
    actions: [
      split("2016-09-08", 10, 2, ANNOUNCED, "Face value ₹10 to ₹2, with a 1:1 bonus (exchange history shows the split only)"),
      bonus("2016-09-08", 1, 1, ANNOUNCED),
      split("2025-06-16", 2, 1, ANNOUNCED, "Face value ₹2 to ₹1, with a 4:1 bonus (exchange history shows the split only)"),
      bonus("2025-06-16", 1, 4, ANNOUNCED),
    ],
  }),
  company({
    slug: "bajaj-finserv-limited",
    name: "Bajaj Finserv Limited",
    cin: "L65923PN2007PLC130075",
    isin: "INE918I01026",
    sector: "Financial services",
    tickerNse: "BAJAJFINSV",
    tickerBse: "532978",
    rta: "KFIN",
    rtaDisplayName: "KFin Technologies Limited",
    nodalOfficer: {
      name: "Ms. Uma Shende (Company Secretary)",
      emails: emails("investors@bajajfinserv.in / bfs.iepfnodalofficer@bajajfinserv.in"),
      phone: null,
      address: null,
    },
    actions: [
      split("2022-09-13", 5, 1, ANNOUNCED, "Face value ₹5 to ₹1, with a 1:1 bonus (exchange history shows the split only)"),
      bonus("2022-09-13", 1, 1, ANNOUNCED),
    ],
  }),
  company({
    slug: "itc-limited",
    name: "ITC Limited",
    cin: "L16005WB1910PLC001985",
    isin: "INE154A01025",
    sector: "Consumer goods",
    tickerNse: "ITC",
    tickerBse: "500875",
    rta: "IN_HOUSE",
    rtaDisplayName: "ITC In-House Investor Service Centre",
    rtaAddress: "Investor Service Centre, ITC Limited, Virginia House, 37 Jawaharlal Nehru Road, Kolkata - 700071",
    rtaEmail: "isc@itc.in",
    nodalOfficer: {
      name: "Company Secretary & Head of Investor Service Centre",
      emails: ["isc@itc.in"],
      phone: "1800-345-8152 / 033-2288-6426",
      address: "Virginia House, 37 Jawaharlal Nehru Road, Kolkata, West Bengal - 700071",
    },
    actions: [
      bonus("2005-08-02", 2, 1, ANNOUNCED, "Bonus 1:2 (not in the exchange split history)"),
      split("2005-09-21", 10, 1),
      bonus("2010-08-03", 1, 1),
      bonus("2016-07-01", 2, 1),
    ],
  }),
  company({
    slug: "titan-company-limited",
    name: "Titan Company Limited",
    cin: "L74999TZ1984PLC001456",
    isin: "INE280A01028",
    sector: "Consumer durables",
    tickerNse: "TITAN",
    tickerBse: "500114",
    rta: "LINK_INTIME",
    rtaDisplayName: "MUFG Intime / TSR Consultants Pvt Ltd",
    rtaAddress: "MUFG Intime India Pvt Ltd (TSR Consultants), Vikhroli West, Mumbai - 400083",
    rtaEmail: "csg-unit@tsrdarashaw.com",
    rtaPhone: "022-66568484",
    nodalOfficer: {
      name: "Company Secretary",
      emails: ["investor@titan.co.in"],
      phone: "04344-664199",
      address: "3, SIPCOT Industrial Complex, Hosur, Tamil Nadu - 635126",
    },
    actions: [
      split("2011-06-23", 10, 1, ANNOUNCED, "Face value ₹10 to ₹1, with a 1:1 bonus (exchange history shows the split only)"),
      bonus("2011-06-23", 1, 1, ANNOUNCED),
    ],
  }),
  company({
    slug: "larsen-and-toubro-limited",
    name: "Larsen & Toubro Limited",
    cin: "L99999MH1946PLC004768",
    isin: "INE018A01030",
    sector: "Engineering and construction",
    tickerNse: "LT",
    tickerBse: "500510",
    rta: "KFIN",
    rtaDisplayName: "KFin Technologies Limited",
    nodalOfficer: {
      name: "Company Secretary & Deputy Nodal Officer (Secretarial Department)",
      emails: [],
      phone: null,
      address: "L&T House, Ballard Estate, N. M. Marg, Mumbai - 400001",
    },
    actions: [bonus("2006-09-28", 1, 1), bonus("2008-10-01", 1, 1), bonus("2013-07-11", 2, 1), bonus("2017-07-13", 2, 1)],
  }),
  company({
    slug: "dabur-india-limited",
    name: "Dabur India Limited",
    cin: "L24230DL1975PLC007908",
    isin: "INE016A01026",
    sector: "Consumer goods",
    tickerNse: "DABUR",
    tickerBse: "500096",
    rta: "KFIN",
    rtaDisplayName: "KFin Technologies Limited",
    nodalOfficer: {
      name: "Company Secretary (IEPF Nodal Officer)",
      emails: [],
      phone: null,
      address: "8/3, Asaf Ali Road, New Delhi - 110002",
    },
    actions: [bonus("2006-01-19", 1, 1), bonus("2007-01-25", 2, 1), bonus("2010-09-08", 1, 1)],
  }),
  company({
    slug: "mrf-limited",
    name: "MRF Limited",
    cin: "L25111TN1960PLC004306",
    isin: "INE883A01011",
    sector: "Tyres",
    tickerNse: "MRF",
    tickerBse: "500290",
    rta: "IN_HOUSE",
    rtaDisplayName: "In-House RTA (MRF Share Department)",
    rtaAddress: "MRF Share Department, 114, Greams Road, Chennai - 600006",
    rtaEmail: "mrfshare@mrfmail.com",
    rtaPhone: "044-28292777",
    nodalOfficer: {
      name: "Company Secretary (IEPF Nodal Officer)",
      emails: ["mrfshare@mrfmail.com"],
      phone: "044-28292777",
      address: "114, Greams Road, Chennai, Tamil Nadu - 600006",
    },
    actions: [],
  }),
  company({
    slug: "shree-cement-limited",
    name: "Shree Cement Limited",
    cin: "L26943RJ1979PLC001935",
    isin: "INE070A01015",
    sector: "Cement",
    tickerNse: "SHREECEM",
    tickerBse: "500387",
    rta: "LINK_INTIME",
    rtaDisplayName: "MUFG Intime India Pvt Ltd",
    rtaEmail: "rnt.helpdesk@linkintime.co.in",
    rtaPhone: "022-49186270",
    nodalOfficer: {
      name: "Company Secretary (IEPF Nodal Officer)",
      emails: ["investor@shreecement.com"],
      phone: null,
      address: "Bangur Nagar, Beawar, Distt. Ajmer, Rajasthan - 305901",
    },
    actions: [],
  }),
  company({
    slug: "tvs-motor-company-limited",
    name: "TVS Motor Company Limited",
    cin: "L35921TN1992PLC022845",
    isin: "INE494B01023",
    sector: "Automobiles",
    tickerNse: "TVSMOTOR",
    tickerBse: "532343",
    rta: "INTEGRATED",
    rtaDisplayName: "Integrated Registry Management Services Pvt Ltd, Chennai",
    nodalOfficer: {
      name: "Company Secretary (IEPF Nodal Officer)",
      emails: [],
      phone: null,
      address: null,
    },
    actions: [
      split("2003-12-18", 10, 1, ANNOUNCED, "Face value ₹10 to ₹1"),
      bonus("2010-09-08", 1, 1, ANNOUNCED),
      {
        actionType: "CASH_ENTITLEMENT",
        exDate: "2026-09-01",
        dividendPerShare: 42.4,
        notes:
          "Bonus of 4 non-convertible redeemable preference shares per equity share (Aug 2025), redeemed in cash on 1 Sep 2026: ₹42.40 per equity share. Equity share count is unchanged.",
        source: ANNOUNCED,
      },
    ],
  }),
  company({
    slug: "hdfc-asset-management-company-limited",
    name: "HDFC Asset Management Company Limited",
    cin: "L65991MH1999PLC123027",
    isin: "INE127D01025",
    sector: "Asset management",
    tickerNse: "HDFCAMC",
    tickerBse: "541729",
    rta: "KFIN",
    rtaDisplayName: "KFin Technologies Limited",
    rtaEmail: "einward.ris@kfintech.com",
    nodalOfficer: {
      name: "Ms. Sonali Chandak (Company Secretary)",
      emails: ["shareholders.relations@hdfcfund.com"],
      phone: null,
      address: "HDFC House, 2nd Floor, H. T. Parekh Marg, 165-166, Backbay Reclamation, Churchgate, Mumbai - 400020",
    },
    actions: [bonus("2025-11-26", 1, 1)],
  }),
];

export function referenceCompanyBySlug(slug: string): ReferenceCompany | undefined {
  return REFERENCE_COMPANIES.find((c) => c.slug === slug);
}

/** "Dr. Reddy's Laboratories Ltd" → "dr-reddys-laboratories-ltd" */
export function companySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
