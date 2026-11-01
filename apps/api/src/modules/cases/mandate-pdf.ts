import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  BRAND,
  BRAND_EMAILS,
  CLIENT_DOC_LABELS,
  documentChecklist,
  SCENARIO_LABELS,
  SCENARIO_TIMELINE_MONTHS,
  type ScenarioType,
} from "@recoveryos/shared";

export interface MandateInput {
  caseCode: string;
  clientName: string;
  clientPhone: string;
  companyName: string;
  folioMasked: string;
  scenario: ScenarioType;
  feePct: number;
  issuedOn: string;
}

const INK = rgb(0.07, 0.1, 0.16);
const MUTED = rgb(0.35, 0.4, 0.48);

/** Wraps text to a width, returning the y after the last line. */
function paragraph(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  width: number,
  color = INK,
): number {
  const words = text.split(/\s+/);
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      page.drawText(line, { x, y, size, font, color });
      y -= size * 1.45;
      line = w;
    } else line = next;
  }
  if (line) {
    page.drawText(line, { x, y, size, font, color });
    y -= size * 1.45;
  }
  return y;
}

/**
 * The Digital Mandate the client signs at step 5. Plain language, the fee
 * staff set for this case in one place, and the limits stated as clearly as
 * the promises. Filing mechanics stay with Finsol and are not spelled out.
 * (Standard PDF fonts cannot draw the rupee sign, so amounts say "Rs.")
 */
export async function buildMandatePdf(m: MandateInput): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Digital Mandate ${m.caseCode}`);
  doc.setAuthor(BRAND.name);
  const page = doc.addPage([595, 842]);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595 - 112;
  let y = 780;

  page.drawText(BRAND.name, { x: 56, y, size: 11, font: bold, color: rgb(0.02, 0.45, 0.65) });
  page.drawText(`Case ${m.caseCode}  ·  Issued ${m.issuedOn}`, {
    x: 330,
    y,
    size: 9,
    font: regular,
    color: MUTED,
  });
  y -= 36;
  page.drawText("Digital Mandate and Scope of Work", {
    x: 56,
    y,
    size: 18,
    font: bold,
    color: INK,
  });
  y -= 30;

  const rows: [string, string][] = [
    ["Client", `${m.clientName} (${m.clientPhone})`],
    ["Holding", `${m.companyName}, folio ${m.folioMasked}`],
    ["Route", SCENARIO_LABELS[m.scenario]],
    [
      "Indicative time",
      `${SCENARIO_TIMELINE_MONTHS[m.scenario][0]} to ${SCENARIO_TIMELINE_MONTHS[m.scenario][1]} months after signing. Not a promise.`,
    ],
    [
      "Fee",
      `${m.feePct}% of the value actually credited to you, plus GST, as agreed for this case. Nothing upfront. Nothing if nothing is credited.`,
    ],
  ];
  for (const [k, v] of rows) {
    page.drawText(k, { x: 56, y, size: 10, font: bold, color: MUTED });
    y = paragraph(page, v, 170, y, regular, 10, W - 114) - 6;
  }

  y -= 8;
  page.drawText("What we will do", { x: 56, y, size: 12, font: bold, color: INK });
  y -= 18;
  for (const s of [
    "Confirm exactly what you hold today, after every bonus and split.",
    "Prepare all paperwork and carry out every filing and legal step on your behalf.",
    "Show you every document before you sign it, and act only on what you approve.",
    "Follow up with the company and the authorities until shares are credited, with a named owner and a next date.",
  ])
    y = paragraph(page, `•  ${s}`, 64, y, regular, 10, W - 8) - 2;

  y -= 8;
  page.drawText("What we will not do", { x: 56, y, size: 12, font: bold, color: INK });
  y -= 18;
  for (const s of [
    "Guarantee recovery: approval rests with the company and the authorities.",
    "Hold your shares or money: shares go to your own demat account and money to your own bank account.",
    "Ask for any OTP, password or PIN by phone, WhatsApp or email.",
  ])
    y = paragraph(page, `•  ${s}`, 64, y, regular, 10, W - 8) - 2;

  y -= 8;
  page.drawText("Documents you will share", { x: 56, y, size: 12, font: bold, color: INK });
  y -= 18;
  y = paragraph(
    page,
    documentChecklist({ scenario: m.scenario })
      .map((d) => CLIENT_DOC_LABELS[d.docType])
      .join("; ") + ".",
    64,
    y,
    regular,
    10,
    W - 8,
  );

  y -= 10;
  y = paragraph(
    page,
    "You may stop at any time before filing at no charge. Your documents are used only for this case and are deleted or returned when it closes. This mandate is signed electronically with Aadhaar eSign under the Information Technology Act, 2000.",
    56,
    y,
    regular,
    9,
    W,
    MUTED,
  );

  page.drawText(
    `Claims & Case Desk: ${BRAND_EMAILS.claims}  ·  Client Support: ${BRAND_EMAILS.support}`,
    {
      x: 56,
      y: 48,
      size: 8,
      font: regular,
      color: MUTED,
    },
  );
  page.drawRectangle({
    x: 56,
    y: 70,
    width: W,
    height: 70,
    borderColor: rgb(0.8, 0.84, 0.9),
    borderWidth: 1,
  });
  page.drawText("Client signature (Aadhaar eSign)", {
    x: 68,
    y: 120,
    size: 9,
    font: bold,
    color: MUTED,
  });
  page.drawText("Awaiting signature", { x: 68, y: 96, size: 11, font: regular, color: MUTED });
  return Buffer.from(await doc.save());
}

/** Stamps the signature block once the eSign provider confirms the signature. */
export async function stampSigned(
  pdf: Buffer,
  signer: string,
  signedAt: Date,
  provider: string,
  requestId: string,
): Promise<Buffer> {
  const doc = await PDFDocument.load(pdf);
  const page = doc.getPages()[0]!;
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  page.drawRectangle({ x: 66, y: 76, width: 300, height: 34, color: rgb(1, 1, 1) });
  page.drawText(`Signed by ${signer}`, {
    x: 68,
    y: 96,
    size: 11,
    font,
    color: rgb(0.02, 0.47, 0.34),
  });
  page.drawText(
    `${signedAt.toISOString().replace("T", " ").slice(0, 16)} UTC · ${provider === "mock" ? "Simulated eSign (development)" : provider === "internal" ? "Electronic acceptance, mobile OTP (not Aadhaar eSign)" : `Aadhaar eSign via ${provider}`} · ${requestId.slice(0, 18)}`,
    { x: 68, y: 80, size: 8, font: regular, color: MUTED },
  );
  return Buffer.from(await doc.save());
}
