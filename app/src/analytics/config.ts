import { env } from "wasp/server";

export function isPlausibleConfigured(): boolean {
  return (
    env.ANALYTICS_ENABLED === "true" &&
    [env.PLAUSIBLE_API_KEY, env.PLAUSIBLE_SITE_ID, env.PLAUSIBLE_BASE_URL].every(Boolean)
  );
}

export function isGoogleAnalyticsServerConfigured(): boolean {
  return env.ANALYTICS_ENABLED === "true" && [
    env.GOOGLE_ANALYTICS_CLIENT_EMAIL,
    env.GOOGLE_ANALYTICS_PRIVATE_KEY,
    env.GOOGLE_ANALYTICS_PROPERTY_ID,
  ].every(Boolean);
}
