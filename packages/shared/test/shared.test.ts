import { describe, expect, it } from "vitest";
import {
  applyAction,
  canAdvanceRecoverStep,
  companySlug,
  computeEntitlement,
  documentChecklist,
  entitlementRangeForDecade,
  INDIAN_STATES,
  maskCompanyName,
  maskFolio,
  netRealization,
  normalizeIndianMobile,
  normalizeName,
  parseIndianState,
  phoneticKey,
  REFERENCE_COMPANIES,
  referenceCompanyBySlug,
  resolveSearch,
  SERVICE_VERTICALS,
  splitName,
} from "../src/index.js";

describe("states", () => {
  it("has 36 states and union territories plus outside India", () => {
    expect(INDIAN_STATES).toHaveLength(37);
    expect(new Set(INDIAN_STATES).size).toBe(37);
  });
  it("parses filing spellings", () => {
    expect(parseIndianState("Maharashtra")).toBe("MAHARASHTRA");
    expect(parseIndianState("NCT of Delhi")).toBe("DELHI");
    expect(parseIndianState("ORISSA")).toBe("ODISHA");
    expect(parseIndianState("Jammu & Kashmir")).toBe("JAMMU_AND_KASHMIR");
    expect(parseIndianState("Foreign")).toBe("OUT_OF_INDIA");
    expect(parseIndianState("Atlantis")).toBeNull();
  });
});

describe("names", () => {
  it("strips honorifics and punctuation", () => {
    expect(normalizeName("  Smt. kamla  devi-AGARWAL ")).toBe("KAMLA DEVI AGARWAL");
    expect(normalizeName("Late Shri R.K. Gupta")).toBe("R K GUPTA");
  });
  it("splits into parts", () => {
    expect(splitName("Ramesh Kumar Agarwal")).toEqual({
      first: "RAMESH",
      middle: "KUMAR",
      last: "AGARWAL",
      full: "RAMESH KUMAR AGARWAL",
    });
  });
  it("gives transliteration variants one key", () => {
    const key = phoneticKey("Agarwal");
    expect(phoneticKey("Agrawal")).toBe(key);
    expect(phoneticKey("Aggarwal")).toBe(key);
    expect(phoneticKey("Srivastava")).toBe(phoneticKey("Shrivastav"));
    expect(phoneticKey("Chaudhary")).toBe(phoneticKey("Choudhari"));
    expect(phoneticKey("Chowdhury")).toBe(phoneticKey("Chaudhary"));
    expect(phoneticKey("Agarwal")).not.toBe(phoneticKey("Gupta"));
  });
});

describe("masking", () => {
  it("masks distinctive words of the company name", () => {
    expect(maskCompanyName("Reliance Industries Ltd")).toBe("R******e Industries Ltd");
    expect(maskCompanyName("Tata Consultancy Services Ltd")).toBe("T**a C*********y Services Ltd");
    expect(maskCompanyName("State Bank of India")).toBe("S***e Bank of India");
  });
  it("always masks something", () => {
    expect(maskCompanyName("India Industries Ltd")).toBe("I***a Industries Ltd");
  });
  it("masks folios without revealing most characters", () => {
    expect(maskFolio("RIL0012345621")).toBe("RIL***21");
    const short = maskFolio("A0012345");
    expect(short.replace(/\*/g, "").length).toBeLessThanOrEqual(4);
    expect(maskFolio("1234")).toBe("****");
  });
  it("normalises Indian mobiles", () => {
    expect(normalizeIndianMobile("098765 43210")).toBe("+919876543210");
    expect(normalizeIndianMobile("+91-98765-43210")).toBe("+919876543210");
    expect(normalizeIndianMobile("12345")).toBeNull();
    expect(normalizeIndianMobile("5876543210")).toBeNull();
  });
});

describe("corporate actions", () => {
  it("applies bonus, split and merger ratios, rounding down", () => {
    expect(
      applyAction(100, { actionType: "BONUS", exDate: "2017-01-01", ratioFrom: 1, ratioTo: 1 }),
    ).toBe(200);
    expect(
      applyAction(101, { actionType: "BONUS", exDate: "2017-01-01", ratioFrom: 2, ratioTo: 1 }),
    ).toBe(151);
    expect(
      applyAction(100, { actionType: "SPLIT", exDate: "2017-01-01", ratioFrom: 10, ratioTo: 2 }),
    ).toBe(500);
    expect(
      applyAction(7, { actionType: "MERGER", exDate: "2017-01-01", ratioFrom: 5, ratioTo: 2 }),
    ).toBe(2);
  });
  it("replays Reliance's four 1:1 bonuses for a 1990 holder", () => {
    const ril = referenceCompanyBySlug("reliance-industries-limited")!;
    const r = computeEntitlement(100, ril.actions, { acquiredOn: "1990-01-01" });
    expect(r.shares).toBe(1600);
  });
  it("only applies actions after the acquisition date", () => {
    const ril = referenceCompanyBySlug("reliance-industries-limited")!;
    expect(computeEntitlement(100, ril.actions, { acquiredOn: "2010-01-01" }).shares).toBe(400);
  });
  it("counts dividends on the shares held at each ex-date", () => {
    const r = computeEntitlement(
      100,
      [
        { actionType: "DIVIDEND", exDate: "2020-01-01", dividendPerShare: 5 },
        { actionType: "BONUS", exDate: "2021-01-01", ratioFrom: 1, ratioTo: 1 },
        { actionType: "DIVIDEND", exDate: "2022-01-01", dividendPerShare: 2.5 },
      ],
      { acquiredOn: "2000-01-01", dividendsFrom: "2019-01-01" },
    );
    expect(r.dividendPaise).toBe(100 * 500 + 200 * 250);
  });
  it("gives a range, not a guess, when only the decade is known", () => {
    const wipro = referenceCompanyBySlug("wipro-limited")!;
    const range = entitlementRangeForDecade(100, 2000, wipro.actions);
    expect(range.low.shares).toBe(884); // bought end of 2009: 2010 (2:3), 2017 (1:1), 2019 (1:3), 2024 (1:1)
    expect(range.high.shares).toBe(5332); // plus 2004 (2:1) and 2005 (1:1)
  });
});

describe("fees", () => {
  it("rounds the fee down and adds GST on the fee", () => {
    const r = netRealization(10_00_000_00, 1000);
    expect(r.feePaise).toBe(1_00_000_00);
    expect(r.gstPaise).toBe(18_000_00);
    expect(r.netPaise).toBe(10_00_000_00 - 1_18_000_00);
  });
});

describe("R.E.C.O.V.E.R.", () => {
  it("moves one step at a time and gates filing on eSign", () => {
    expect(canAdvanceRecoverStep(1, 2, { esignSigned: false, srnFiled: false }).ok).toBe(true);
    expect(canAdvanceRecoverStep(1, 3, { esignSigned: false, srnFiled: false }).ok).toBe(false);
    expect(canAdvanceRecoverStep(3, 2, { esignSigned: false, srnFiled: false }).ok).toBe(false);
    expect(canAdvanceRecoverStep(5, 6, { esignSigned: false, srnFiled: false }).ok).toBe(false);
    expect(canAdvanceRecoverStep(5, 6, { esignSigned: true, srnFiled: false }).ok).toBe(true);
    expect(canAdvanceRecoverStep(6, 7, { esignSigned: true, srnFiled: false }).ok).toBe(false);
  });
  it("adds heir documents for a deceased holder", () => {
    const docs = documentChecklist({ scenario: "DECEASED_TRANSMISSION" }).map((d) => d.docType);
    expect(docs).toContain("DEATH_CERTIFICATE");
    expect(docs).toContain("LEGAL_HEIR_OR_SUCCESSION_CERT");
    expect(documentChecklist({ scenario: "STANDARD_IEPF5" }).map((d) => d.docType)).not.toContain(
      "DEATH_CERTIFICATE",
    );
  });
});

describe("search contract", () => {
  it("resolves the four search modes", () => {
    expect(
      resolveSearch({ firstName: "Ramesh", middleName: "K", lastName: "Agarwal", state: "DELHI" })
        ?.mode,
    ).toBe("FULL");
    expect(resolveSearch({ firstName: "Ramesh", state: "DELHI" })?.mode).toBe("FIRST");
    expect(resolveSearch({ middleName: "Kumar", state: "DELHI" })?.mode).toBe("MIDDLE");
    expect(resolveSearch({ lastName: "Agarwal", state: "DELHI" })?.mode).toBe("LAST");
    expect(resolveSearch({ fullName: "Shri Ramesh Agarwal", state: "DELHI" })).toMatchObject({
      mode: "FULL",
      first: "RAMESH",
      last: "AGARWAL",
    });
    expect(resolveSearch({ state: "DELHI" })).toBeNull();
  });
});

describe("reference data", () => {
  it("holds the 15 verified companies, each with a nodal officer and no price", () => {
    expect(REFERENCE_COMPANIES).toHaveLength(15);
    expect(new Set(REFERENCE_COMPANIES.map((c) => c.slug)).size).toBe(15);
    expect(new Set(REFERENCE_COMPANIES.map((c) => c.isin)).size).toBe(15);
    for (const c of REFERENCE_COMPANIES) {
      expect(companySlug(c.name)).toBe(c.slug);
      expect(c.isin).toMatch(/^INE[0-9A-Z]{9}$/);
      expect(c.nodalOfficer.name.length).toBeGreaterThan(3);
      expect(c.contactsVerifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (c.cin) expect(c.cin).toMatch(/^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/);
      else expect(c.statutoryBasis).toBeTruthy();
      expect(c).not.toHaveProperty("currentMarketPrice");
      for (const a of c.actions) expect(a.source).toBeTruthy();
    }
  });
  it("applies Bajaj Finance's split-plus-bonus pairs (100x since 2010)", () => {
    const bf = referenceCompanyBySlug("bajaj-finance-limited")!;
    expect(computeEntitlement(100, bf.actions, { acquiredOn: "2010-01-01" }).shares).toBe(10_000);
  });
  it("counts TVS Motor's redeemed preference shares as cash, not shares", () => {
    const tvs = referenceCompanyBySlug("tvs-motor-company-limited")!;
    const r = computeEntitlement(100, tvs.actions, { acquiredOn: "2000-01-01" });
    expect(r.shares).toBe(2000);
    expect(r.cashPaise).toBe(2000 * 4240);
    expect(r.dividendPaise).toBe(0);
  });
  it("has the eleven service verticals", () => {
    expect(SERVICE_VERTICALS).toHaveLength(11);
  });
});
