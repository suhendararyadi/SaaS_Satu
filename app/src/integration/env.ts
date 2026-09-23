import * as z from "zod";

// Read-only integration token used by OpenClaw to read School OS data.
//
// Optional on purpose: when unset, the integration endpoints deny every request
// (they never fall open). Keeping it optional also means a missing/rotated token
// can never stop the server from booting.
export const integrationEnvSchema = z.object({
  INTEGRATION_TOKEN: z.string().optional(),
});
