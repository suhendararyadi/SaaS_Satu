import { env, HttpError } from "wasp/server";

const requiredStripeValues = () => [
  env.STRIPE_API_KEY,
  env.STRIPE_WEBHOOK_SECRET,
  env.PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID,
  env.PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID,
  env.PAYMENTS_CREDITS_10_PLAN_ID,
];

export function isPaymentsConfigured(): boolean {
  return env.PAYMENTS_ENABLED === "true" && requiredStripeValues().every(Boolean);
}

export function ensurePaymentsConfigured(): void {
  if (!isPaymentsConfigured()) {
    throw new HttpError(503, "Pembayaran online belum dikonfigurasi pada deployment ini.");
  }
}
