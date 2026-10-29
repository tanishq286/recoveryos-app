import {
  BanknoteIcon,
  BriefcaseBusinessIcon,
  ChartCandlestickIcon,
  ChartPieIcon,
  FileStackIcon,
  GavelIcon,
  GlobeIcon,
  HandCoinsIcon,
  HeartHandshakeIcon,
  LandmarkIcon,
  ShieldIcon,
  type LucideIcon,
} from "lucide-react";

/** One icon per service vertical, keyed by slug. */
export const SERVICE_ICONS: Record<string, LucideIcon> = {
  "iepf-claim": ChartCandlestickIcon,
  "duplicate-shares": FileStackIcon,
  "transmission-of-shares": HeartHandshakeIcon,
  "physical-to-demat": BriefcaseBusinessIcon,
  "unclaimed-mutual-funds": ChartPieIcon,
  "inoperative-bank-deposits": LandmarkIcon,
  "unclaimed-epf": BanknoteIcon,
  "unclaimed-insurance": ShieldIcon,
  "debtor-recovery": HandCoinsIcon,
  "litigation-funding": GavelIcon,
  "nri-samadhan": GlobeIcon,
};
