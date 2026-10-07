import type { Confidence, EvidenceCategory, ExtractionStatus } from "@/lib/types";

export const CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  share_certificate: "Share certificate",
  identity_proof: "Identity proof",
  address_proof: "Address proof",
  bank_proof: "Bank proof",
  demat_proof: "Demat proof",
  company_correspondence: "Company / registrar letter",
  name_change_proof: "Name-change proof",
  succession_document: "Succession document",
  iepf_filing: "IEPF filing",
  authority_correspondence: "IEPF Authority letter",
};

export const EXTRACTION_LABELS: Record<
  ExtractionStatus,
  { label: string; variant: "neutral" | "progress" | "confirmed" | "blocker"; explain: string }
> = {
  queued: {
    label: "Queued",
    variant: "neutral",
    explain: "Waiting to be read.",
  },
  extracting: {
    label: "Reading now",
    variant: "progress",
    explain: "We are reading this document. It usually takes under a minute.",
  },
  extracted: {
    label: "Read",
    variant: "neutral",
    explain: "Every page was read. Details are listed below with the page they came from.",
  },
  needs_review: {
    label: "Needs checking",
    variant: "progress",
    explain: "Read, but at least one detail needs a person to check it.",
  },
  failed: {
    label: "Couldn't read",
    variant: "blocker",
    explain: "We could not read this file, so nothing from it has been used.",
  },
  not_applicable: {
    label: "Kept as record",
    variant: "neutral",
    explain: "Stored for the record. No details are needed from it.",
  },
};

export const CONFIDENCE_LABELS: Record<Confidence, { label: string; short: string }> = {
  high: { label: "High confidence", short: "High" },
  medium: { label: "Medium confidence: please check", short: "Medium" },
  low: { label: "Low confidence: check carefully", short: "Low" },
  not_found: { label: "Not found in this document", short: "Not found" },
};
