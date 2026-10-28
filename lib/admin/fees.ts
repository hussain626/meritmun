import type {
  DelegateRecord,
  DelegationRecord,
  FeeType,
  PricingSettings,
} from "@/lib/admin/types";

/**
 * Current fee for a fee type and social tier (used for rows registered before
 * quotes were stored). An early-bird price left blank falls back to the
 * regular price of the same tier.
 */
export function feeForType(
  feeType: FeeType,
  pricing: PricingSettings,
  withSocial = true,
): number {
  switch (feeType) {
    case "early_bird_delegate":
      return withSocial
        ? (pricing.earlyBirdDelegateFee ?? pricing.delegateFee)
        : (pricing.earlyBirdDelegateFeeNoSocial ?? pricing.delegateFeeNoSocial);
    case "delegation_member":
      return withSocial ? pricing.perDelegateFee : pricing.perDelegateFeeNoSocial;
    case "early_bird_delegation_member":
      return withSocial
        ? (pricing.earlyBirdPerDelegateFee ?? pricing.perDelegateFee)
        : (pricing.earlyBirdPerDelegateFeeNoSocial ?? pricing.perDelegateFeeNoSocial);
    default:
      return withSocial ? pricing.delegateFee : pricing.delegateFeeNoSocial;
  }
}

/**
 * The amount owed is what the registrant was quoted (and emailed). Rows from
 * before migration 008 have no quote, so they fall back to current pricing.
 */
export function owedAmount(
  quoted: unknown,
  feeType: FeeType,
  pricing: PricingSettings,
  withSocial = true,
): number {
  return typeof quoted === "number" && Number.isFinite(quoted)
    ? quoted
    : feeForType(feeType, pricing, withSocial);
}

export function owedAmountTotal(quoted: unknown, computed: number): number {
  return typeof quoted === "number" && Number.isFinite(quoted) ? quoted : computed;
}

export function owedForDelegate(d: DelegateRecord, pricing: PricingSettings): number {
  return owedAmount(d.quotedAmount, d.feeType, pricing, d.withSocial ?? true);
}

/** Whole-delegation amount: its quote, or per-head fees plus the flat fee. */
export function owedForDelegation(
  delegation: DelegationRecord,
  members: DelegateRecord[],
  pricing: PricingSettings,
): number {
  return owedAmountTotal(
    delegation.quotedAmount,
    members.reduce((sum, m) => sum + owedForDelegate(m, pricing), 0) +
      pricing.delegationFee,
  );
}
