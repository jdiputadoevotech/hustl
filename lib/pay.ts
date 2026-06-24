import type { PayPeriod } from "@/lib/types/database";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const PERIOD_SUFFIX: Record<PayPeriod, string> = {
  project: "",
  hourly: "/hr",
  weekly: "/wk",
  monthly: "/mo",
};

/** Human label for a job's pay cadence. */
export function payPeriodLabel(period: PayPeriod): string {
  return period === "project" ? "Project budget" : `${period} rate`;
}

/**
 * Format a job's pay range, e.g. "₱500–₱1,000" (project) or "₱120–₱150/hr".
 * Handles a single bound (only min or only max) gracefully.
 */
export function formatPay(
  min: number | null,
  max: number | null,
  period: PayPeriod,
): string {
  const suffix = PERIOD_SUFFIX[period];
  if (min == null && max == null) return "Negotiable";
  if (min != null && max != null && min !== max) {
    return `${peso.format(min)}–${peso.format(max)}${suffix}`;
  }
  // Single value (both equal, or only one provided).
  const value = (min ?? max) as number;
  return `${peso.format(value)}${suffix}`;
}
