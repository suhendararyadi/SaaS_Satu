import * as z from "zod";
import { paymentPlansSchema } from "../env";

export const lemonSqueezyEnvSchema = paymentPlansSchema.extend({
  LEMONSQUEEZY_API_KEY: z.string().min(1).optional(),
  LEMONSQUEEZY_WEBHOOK_SECRET: z.string().min(1).optional(),
  LEMONSQUEEZY_STORE_ID: z.string().min(1).optional(),
});
