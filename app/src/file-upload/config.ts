import { env, HttpError } from "wasp/server";

export function isFileUploadConfigured(): boolean {
  return env.FILE_UPLOADS_ENABLED === "true" && [
    env.AWS_S3_REGION,
    env.AWS_S3_IAM_ACCESS_KEY,
    env.AWS_S3_IAM_SECRET_KEY,
    env.AWS_S3_FILES_BUCKET,
  ].every(Boolean);
}

export function ensureFileUploadConfigured(): void {
  if (!isFileUploadConfigured()) {
    throw new HttpError(503, "Penyimpanan file belum dikonfigurasi pada deployment ini.");
  }
}
