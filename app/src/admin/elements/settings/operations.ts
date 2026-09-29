import { HttpError, env } from "wasp/server";
import { type GetPlatformStatus } from "wasp/server/operations";

export type PlatformStatus = {
  paymentsEnabled: boolean;
  fileUploadsEnabled: boolean;
};

/**
 * Status konfigurasi level platform untuk Super Admin.
 * Hanya mengembalikan boolean — tidak pernah membocorkan nilai secret.
 */
export const getPlatformStatus: GetPlatformStatus<void, PlatformStatus> = async (
  _args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(
      401,
      "Hanya pengguna terautentikasi yang dapat mengakses status platform.",
    );
  }

  if (!context.user.isAdmin) {
    throw new HttpError(
      403,
      "Hanya admin yang dapat mengakses status platform.",
    );
  }

  return {
    paymentsEnabled: env.PAYMENTS_ENABLED === "true",
    fileUploadsEnabled: env.FILE_UPLOADS_ENABLED === "true",
  };
};
