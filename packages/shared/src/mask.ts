/**
 * Teaser masking. A visitor who has not verified a phone number sees enough
 * to recognise a holding (holder, father or spouse, city, shares, estimate)
 * but not enough to act on it without us: the company's distinctive name and
 * the folio number stay masked until the unlock step.
 */

/** Words that describe a company rather than identify it; they stay readable. */
const GENERIC_WORDS = new Set([
  "LTD",
  "LTD.",
  "LIMITED",
  "PVT",
  "PRIVATE",
  "CO",
  "CO.",
  "COMPANY",
  "CORPORATION",
  "CORP",
  "INDUSTRIES",
  "INDUSTRY",
  "INDIA",
  "OF",
  "AND",
  "&",
  "THE",
  "BANK",
  "SERVICES",
  "FINANCE",
  "FINANCIAL",
  "MOTORS",
  "MOTOR",
  "STEEL",
  "CEMENT",
  "CEMENTS",
  "PHARMACEUTICAL",
  "PHARMACEUTICALS",
  "PAINTS",
  "ENTERPRISES",
  "HOLDINGS",
  "TECHNOLOGIES",
  "TECHNOLOGY",
  "INTERNATIONAL",
  "LABORATORIES",
  "POWER",
  "ENERGY",
  "GAS",
  "OIL",
  "NATURAL",
  "MOTOCORP",
  "COMPANY.",
]);

function maskWord(word: string): string {
  const letters = [...word];
  if (letters.length <= 2) return "*".repeat(letters.length);
  if (letters.length === 3) return `${letters[0]}**`;
  return `${letters[0]}${"*".repeat(letters.length - 2)}${letters[letters.length - 1]}`;
}

/**
 * "Reliance Industries Ltd" → "R******e Industries Ltd"
 * "Tata Consultancy Services Ltd" → "T**a C*********y Services Ltd"
 * At least one word is always masked, even when every word is generic.
 */
export function maskCompanyName(name: string): string {
  const words = name.trim().split(/\s+/);
  let masked = 0;
  const out = words.map((w) => {
    if (GENERIC_WORDS.has(w.toUpperCase())) return w;
    masked++;
    return maskWord(w);
  });
  if (masked === 0 && out.length > 0) out[0] = maskWord(out[0]!);
  return out.join(" ");
}

/**
 * "RIL0012345621" → "RIL***21". Never reveals more than about 45% of the
 * characters, so a short folio is not effectively shown in full.
 */
export function maskFolio(folio: string): string {
  const f = folio.trim();
  if (f.length <= 4) return "*".repeat(f.length);
  const suffix = f.length >= 8 ? 2 : 1;
  const prefix = Math.max(1, Math.min(5, Math.floor(f.length * 0.45) - suffix));
  return `${f.slice(0, prefix)}***${f.slice(-suffix)}`;
}

/** "+91 98765 43210" → "+91 ••••• •3210" for receipts and CRM cards. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `+${digits.length > 10 ? digits.slice(0, digits.length - 10) : "91"} ••••• •${digits.slice(-4)}`;
}

/** Normalises an Indian mobile number to E.164 (+91XXXXXXXXXX), or null when it isn't one. */
export function normalizeIndianMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const local =
    digits.length === 12 && digits.startsWith("91")
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith("0")
        ? digits.slice(1)
        : digits;
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}
