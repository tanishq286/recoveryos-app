import { CheckIcon, CircleAlertIcon, ClockIcon, HourglassIcon, SearchIcon } from "lucide-react";

import type { ExtractionStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { EXTRACTION_LABELS } from "@/lib/labels";

const ICONS = {
  queued: ClockIcon,
  extracting: HourglassIcon,
  extracted: CheckIcon,
  needs_review: SearchIcon,
  failed: CircleAlertIcon,
  not_applicable: CheckIcon,
} satisfies Record<ExtractionStatus, typeof CheckIcon>;

export function ExtractionBadge({ status }: { status: ExtractionStatus }) {
  const s = EXTRACTION_LABELS[status];
  const Icon = ICONS[status];
  return (
    <Badge variant={s.variant}>
      <Icon aria-hidden="true" />
      {s.label}
    </Badge>
  );
}
