/**
 * Regression tests for the PDF table reader (November 2026 audit). The
 * geometry mirrors the published Dabur IEPF-2 layout, with synthetic text.
 */
import { describe, expect, it } from "vitest";

import { gutterBetween, splitRun, type PdfItem } from "../src/statement-reader.js";
import { parseRow, mapHeaders } from "../src/ingest-iepf.js";

const item = (str: string, x: number, w: number, y = 0): PdfItem => ({ str, x, w, y });

describe("splitRun", () => {
  it("splits an amount run that carries the next cell's day", () => {
    const [amount, day] = splitRun(item("1234.50 02", 728, 22));
    expect(amount!.str).toBe("1234.50");
    expect(day!.str).toBe("02");
    expect(day!.x).toBeGreaterThan(amount!.x + amount!.w);
    expect(day!.x + day!.w).toBeCloseTo(750, 0);
  });

  it("splits a digit glued to a capitalised word with no space (…-9Amount)", () => {
    const parts = splitRun(item("12345678-9Amount", 631, 40));
    expect(parts.map((p) => p.str)).toEqual(["12345678-9", "Amount"]);
  });

  it("leaves single words alone", () => {
    expect(splitRun(item("SHARMA", 238, 20))).toHaveLength(1);
  });
});

describe("gutterBetween", () => {
  // Father/Husband Last Name header spans 241-281; Address header 313-328.
  // Address data is left-set at 287 and its first word is short.
  const words: PdfItem[] = [];
  for (let i = 0; i < 40; i++) {
    words.push(item("SURNAME", 238, 30 + (i % 10)));
    words.push(item(i % 3 ? "C/O" : "12", 287, 7));
    words.push(item("SOME", 296, 14));
    words.push(item("ROAD", 311, 14));
  }

  it("puts the boundary just left of the address column, not at the header midpoint", () => {
    const b = gutterBetween(281, 313, words);
    expect(b).toBeGreaterThan(278);
    expect(b).toBeLessThan(287);
    // The old nearest-header-centre rule sent a word at 287 to the left column.
    expect((241 + 281) / 2 < 287 && 287 - (241 + 281) / 2 < (313 + 328) / 2 - 287).toBe(true);
  });

  it("anchors on the next column's text even when an empty stretch follows it", () => {
    // Address words end near 354; "INDIA" sits at 356-367; nothing from 367 to the Country header at 369.
    // Address words continue the cell after word spaces, at varying positions; only
    // "INDIA" begins a new cell, so only it is a cell start (as the reader computes).
    const street = Array.from({ length: 30 }, (_, i) => item("STREET", 318 + (i % 12), 24));
    const india = Array.from({ length: 30 }, () => item("INDIA", 356, 11));
    const b = gutterBetween(328, 369, [...street, ...india], new Set(india));
    expect(b).toBeLessThanOrEqual(356);
    expect(b).toBeGreaterThan(353);
  });
});

describe("parseRow", () => {
  const headers = [
    "Investor First Name",
    "Investor Middle Name",
    "Investor Last Name",
    "Father/Husband First Name",
    "Father/Husband Middle Name",
    "Father/Husband Last Name",
    "Address",
    "Country",
    "State",
    "District",
    "Pin Code",
    "Folio Number",
    "DP Id-Client Id-Account Number",
    "Investment Type",
    "Amount transferred",
    "Proposed Date of transfer to IEPF",
  ];
  const { map } = mapHeaders(headers);
  const row = (over: Partial<Record<string, string>>) => headers.map((h) => over[h] ?? "");
  const base = {
    "Investor First Name": "ASHA",
    "Investor Last Name": "TESTCASE",
    Address: "1 TEST LANE",
    Country: "INDIA",
    State: "DELHI",
    District: "NEW DELHI",
    "Pin Code": "110001",
    "Folio Number": "T0000001",
    "Investment Type": "Amount for unclaimed and unpaid dividend",
    "Amount transferred": "120.50",
    "Proposed Date of transfer to IEPF": "02-DEC-2019",
  };

  it("drops the NA placeholder and keeps the raw relative separately", () => {
    const r = parseRow(row({ ...base, "Father/Husband First Name": "NA" }), map, 1, "IEPF_2");
    expect(r?.ok).toBe(true);
    if (!r?.ok) return;
    expect(r.value.fatherOrSpouse).toBeNull();
    expect(r.value.fatherOrSpouseRaw).toBe("NA");
    expect(r.value.issues).toContain("RELATIVE_MISSING");
  });

  it("quarantines a relative with spilled address text", () => {
    const r = parseRow(
      row({ ...base, "Father/Husband First Name": "NA", "Father/Husband Last Name": "C/O" }),
      map,
      1,
      "IEPF_2",
    );
    expect(r?.ok && r.value.issues).toContain("RELATIVE_SUSPECT");
  });

  it("quarantines an amount cell holding two numbers instead of concatenating them", () => {
    const r = parseRow(row({ ...base, "Amount transferred": "120.50 02" }), map, 1, "IEPF_2");
    expect(r?.ok).toBe(false);
    expect(r && !r.ok && r.issues).toEqual(["AMOUNT_AMBIGUOUS"]);
  });

  it("reads a date with a header remnant before it", () => {
    const r = parseRow(
      row({ ...base, "Proposed Date of transfer to IEPF": "(DD-MON-YYYY) 02-DEC-2019" }),
      map,
      1,
      "IEPF_2",
    );
    expect(r?.ok && r.value.eventDate?.toISOString().slice(0, 10)).toBe("2019-12-02");
  });

  it("carries the reader's wrapped-name note into a quarantining issue", () => {
    const r = parseRow(row(base), map, 1, "IEPF_2", ["WRAPPED_NAME"]);
    expect(r?.ok && r.value.issues).toContain("WRAPPED_NAME");
  });
});
