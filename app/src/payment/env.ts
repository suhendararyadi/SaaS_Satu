import * as z from "zod";

export const paymentPlansSchema = z.object({
  PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID: z.string().min(1).optional(),
  PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID: z.string().min(1).optional(),
  PAYMENTS_CREDITS_10_PLAN_ID: z.string().min(1).optional(),
});
