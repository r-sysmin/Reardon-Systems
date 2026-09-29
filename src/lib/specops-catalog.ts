import { parse as parseYaml } from "yaml";
import catalogYaml from "../content/specops-plans/catalog.yaml?raw";

export type BillingInterval = "month" | "year";

export type SpecOpsPricePoint = {
  amount: number;
  display: string;
  priceId?: string;
};

export type SpecOpsPlan = {
  id: string;
  order: number;
  tier: number;
  name: string;
  stripe: {
    productId?: string;
    productName: string;
    description: string;
    statementDescriptor: string;
  };
  currency: string;
  prices: {
    month: SpecOpsPricePoint | null;
    year: SpecOpsPricePoint | null;
  };
  seats: string;
  target: string;
  trialDays: number | null;
  checkout: "payment_element" | "payment_link" | "contact";
  ctaHref?: string;
  ctaLabel?: string;
  displayHint?: string;
  pricingTable?: {
    customCta: boolean;
    buttonLabel: string;
    url: string;
  };
  includes: string[];
  excludesNotes: string[];
};

let cached: SpecOpsPlan[] | null = null;

export function getSpecOpsPlans(): SpecOpsPlan[] {
  if (cached) return cached;
  cached = parseYaml(catalogYaml) as SpecOpsPlan[];
  return cached;
}

export function getPayableSpecOpsPlan(id: string): SpecOpsPlan | undefined {
  const plan = getSpecOpsPlans().find((p) => p.id === id);
  if (!plan) return undefined;
  if (plan.checkout === "contact") return undefined;
  if (!plan.prices.month && !plan.prices.year) return undefined;
  return plan;
}

export function resolvePlanPrice(
  plan: SpecOpsPlan,
  interval: BillingInterval,
): SpecOpsPricePoint | null {
  return plan.prices[interval] ?? null;
}

export function parseBillingInterval(
  value: string | null | undefined,
): BillingInterval {
  return value === "month" ? "month" : "year";
}
