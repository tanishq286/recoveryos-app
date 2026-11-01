const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(n: number): string {
  return n < 20 ? ONES[n]! : [TENS[Math.floor(n / 10)], ONES[n % 10]].filter(Boolean).join(" ");
}

function belowThousand(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
}

/** A whole number in the Indian system: crore, lakh, thousand. */
export function numberToIndianWords(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 1_00_00_000);
  n %= 1_00_00_000;
  if (crore) parts.push(`${crore >= 100 ? numberToIndianWords(crore) : belowHundred(crore)} Crore`);
  const lakh = Math.floor(n / 1_00_000);
  n %= 1_00_000;
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (n) parts.push(belowThousand(n));
  return parts.join(" ");
}

/** Paise as "Rupees … and … Paise Only", the way Indian valuation reports state amounts. */
export function rupeesInWords(paise: number): string {
  const rupees = Math.floor(Math.max(0, paise) / 100);
  const p = Math.round(Math.max(0, paise) % 100);
  return `Rupees ${numberToIndianWords(rupees)}${p ? ` and ${belowHundred(p)} Paise` : ""} Only`;
}
