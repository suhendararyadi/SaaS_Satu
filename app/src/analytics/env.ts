import * as z from "zod";

export const plausibleEnvSchema = z.object({
  ANALYTICS_ENABLED: z.enum(["true", "false"]).default("false"),
  PLAUSIBLE_API_KEY: z.string().min(1).optional(),
  PLAUSIBLE_SITE_ID: z.string().min(1).optional(),
  PLAUSIBLE_BASE_URL: z.string().url().optional(),
});

export const googleAnalyticsEnvSchema = z.object({
  GOOGLE_ANALYTICS_CLIENT_EMAIL: z.string().min(1).optional(),
  GOOGLE_ANALYTICS_PRIVATE_KEY: z.string().min(1).optional(),
  GOOGLE_ANALYTICS_PROPERTY_ID: z.string().min(1).optional(),
});
