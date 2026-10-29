import { INDIAN_STATES, STATE_LABELS } from "@recoveryos/shared";

/** States and union territories in alphabetical order, "Outside India" last. */
const ORDERED = [...INDIAN_STATES]
  .filter((s) => s !== "OUT_OF_INDIA")
  .sort((a, b) => STATE_LABELS[a].localeCompare(STATE_LABELS[b]));

export function StateOptions({ placeholder = "Choose a state" }: { placeholder?: string }) {
  return (
    <>
      <option value="">{placeholder}</option>
      {ORDERED.map((s) => (
        <option key={s} value={s}>
          {STATE_LABELS[s]}
        </option>
      ))}
      <option value="OUT_OF_INDIA">{STATE_LABELS.OUT_OF_INDIA}</option>
    </>
  );
}
