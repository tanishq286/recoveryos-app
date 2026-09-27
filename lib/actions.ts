"use server";

import { revalidatePath } from "next/cache";

import { getDataSource } from "@/lib/data";
import { ASSET_TYPES, HOLDER_TYPES } from "@/lib/types";
import type {
  EligibilityAssessment,
  FieldReviewInput,
  FieldReviewResult,
  IdentifierKind,
  TriageInput,
} from "@/lib/types";

/*
 * Server actions are public POST endpoints: every input is re-validated here,
 * whatever the client already checked.
 */

const MAX_VALUE = 200;
const MAX_REASON = 500;

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

export async function reviewFieldAction(raw: FieldReviewInput): Promise<FieldReviewResult> {
  const caseId = str(raw?.caseId);
  const fieldId = str(raw?.fieldId);
  if (
    !caseId ||
    !fieldId ||
    !/^[a-z0-9-]{1,64}$/i.test(caseId) ||
    !/^[a-z0-9-]{1,64}$/i.test(fieldId)
  ) {
    return {
      ok: false,
      error: "That request didn't look right. Please reload the page and try again.",
    };
  }

  let input: FieldReviewInput;
  if (raw.decision === "approve") {
    input = { caseId, fieldId, decision: "approve" };
  } else if (raw.decision === "correct") {
    const correctedValue = str(raw.correctedValue)?.trim() ?? "";
    const reason = str(raw.reason)?.trim() ?? "";
    if (!correctedValue) return { ok: false, error: "Enter the correct value." };
    if (correctedValue.length > MAX_VALUE) {
      return { ok: false, error: `Keep the corrected value under ${MAX_VALUE} characters.` };
    }
    if (!reason) return { ok: false, error: "Tell us briefly what we got wrong." };
    if (reason.length > MAX_REASON) {
      return { ok: false, error: `Keep the reason under ${MAX_REASON} characters.` };
    }
    input = { caseId, fieldId, decision: "correct", correctedValue, reason };
  } else {
    return { ok: false, error: "Choose approve or correct." };
  }

  try {
    const result = await getDataSource().reviewField(input);
    if (result.ok) {
      revalidatePath(`/cases/${caseId}`);
      revalidatePath(`/cases/${caseId}/evidence`);
    }
    return result;
  } catch {
    return {
      ok: false,
      error: "We couldn't save that just now. Nothing was changed — please try again.",
    };
  }
}

const IDENTIFIER_KINDS: IdentifierKind[] = ["folio", "dp_client", "uan", "account_last4"];

export type TriageActionResult =
  { ok: true; assessment: EligibilityAssessment } | { ok: false; error: string };

export async function assessEligibilityAction(raw: TriageInput): Promise<TriageActionResult> {
  const assetType = ASSET_TYPES.find((a) => a === raw?.assetType);
  const holderType = HOLDER_TYPES.find((h) => h === raw?.holderType);
  if (!assetType || !holderType) {
    return { ok: false, error: "Some answers were missing. Please go back and check each step." };
  }

  const year = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : null);
  const identifierKind = IDENTIFIER_KINDS.find((k) => k === raw.identifierKind) ?? null;
  const identifier = str(raw.identifier)?.trim().slice(0, 32) || null;

  const input: TriageInput = {
    assetType,
    holderType,
    issuerName: str(raw.issuerName)?.trim().slice(0, 120) || null,
    lastActivityYear: year(raw.lastActivityYear),
    acquiredYear: year(raw.acquiredYear),
    identifierKind: identifier ? identifierKind : null,
    identifier: identifierKind ? identifier : null,
  };

  try {
    return { ok: true, assessment: await getDataSource().assessEligibility(input) };
  } catch {
    return {
      ok: false,
      error: "We couldn't run the check just now. Your answers are still here — please try again.",
    };
  }
}
