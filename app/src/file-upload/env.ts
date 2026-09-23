import * as z from "zod";

export const fileUploadEnvSchema = z.object({
  FILE_UPLOADS_ENABLED: z.enum(["true", "false"]).default("false"),
  AWS_S3_REGION: z.string().min(1).optional(),
  AWS_S3_IAM_ACCESS_KEY: z.string().min(1).optional(),
  AWS_S3_IAM_SECRET_KEY: z.string().min(1).optional(),
  AWS_S3_FILES_BUCKET: z.string().min(1).optional(),
});
