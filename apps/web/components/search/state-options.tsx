import { INDIAN_STATES, STATE_LABELS } from "@finsol/shared";

/** The 36 states and union territories in alphabetical order, then Out of India / NRI. */
const ORDERED = [...INDIAN_STATES]
  .filter((s) => s !== "OUT_OF_INDIA")
  .sort((a, b) => STATE_LABELS[a].localeCompare(STATE_LABELS[b]));

export function StateOptions({
  placeholder = "Choose a state",
  allIndia = false,
}: {
  placeholder?: string;
  /** Offer the Pan-India search, for families who moved across states. */
  allIndia?: boolean;
}) {
  return (
    <>
      <option value="">{placeholder}</option>
      {allIndia && <option value="ALL_INDIA">All India (Pan-India Search)</option>}
      {ORDERED.map((s) => (
        <option key={s} value={s}>
          {STATE_LABELS[s]}
        </option>
      ))}
      <option value="OUT_OF_INDIA">Out of India / NRI</option>
    </>
  );
}
