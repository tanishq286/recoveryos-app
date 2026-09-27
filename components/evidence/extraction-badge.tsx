import { Check, CircleAlert, Clock, Hourglass, Search } from "lucide-react";

import type { ExtractionStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { EXTRACTION_LABELS } from "@/lib/labels";

const ICONS = {
  queued: Clock,
  extracting: Hourglass,
  extracted: Check,
  needs_review: Search,
  failed: CircleAlert,
  not_applicable: Check,
} satisfies Record<ExtractionStatus, typeof Check>;

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
