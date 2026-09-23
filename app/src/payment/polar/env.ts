import * as z from "zod";
import { paymentPlansSchema } from "../env";

export const polarEnvSchema = paymentPlansSchema.extend({
  POLAR_ORGANIZATION_ACCESS_TOKEN: z.string().min(1).optional(),
  POLAR_SANDBOX_MODE: z.string().min(1).optional(),
  POLAR_WEBHOOK_SECRET: z.string().min(1).optional(),
});
