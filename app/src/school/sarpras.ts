export const ASSET_CONDITIONS = ["GOOD", "FAIR", "DAMAGED", "LOST", "MAINTENANCE"] as const;
export type AssetConditionCode = (typeof ASSET_CONDITIONS)[number];

export const ASSET_STATUSES = ["ACTIVE", "INACTIVE", "DISPOSED"] as const;
export type AssetStatusCode = (typeof ASSET_STATUSES)[number];

export const ASSET_MAINTENANCE_STATUSES = ["REPORTED", "PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELED"] as const;
export type AssetMaintenanceStatusCode = (typeof ASSET_MAINTENANCE_STATUSES)[number];

export const ASSET_MOVEMENT_TYPES = ["ACQUISITION", "TRANSFER", "REPAIR", "RETURN", "DISPOSAL", "ADJUSTMENT"] as const;
export type AssetMovementTypeCode = (typeof ASSET_MOVEMENT_TYPES)[number];

export const ASSET_CONDITION_META: Record<AssetConditionCode, { label: string; tone: "success" | "warning" | "error" | "outline" | "primary" }> = {
  GOOD: { label: "Baik", tone: "success" },
  FAIR: { label: "Cukup", tone: "warning" },
  DAMAGED: { label: "Rusak", tone: "error" },
  LOST: { label: "Hilang", tone: "error" },
  MAINTENANCE: { label: "Pemeliharaan", tone: "primary" },
};

export const ASSET_STATUS_META: Record<AssetStatusCode, { label: string }> = {
  ACTIVE: { label: "Aktif" },
  INACTIVE: { label: "Tidak Aktif" },
  DISPOSED: { label: "Dihapuskan" },
};

export const MAINTENANCE_STATUS_META: Record<AssetMaintenanceStatusCode, { label: string }> = {
  REPORTED: { label: "Dilaporkan" },
  PLANNED: { label: "Dijadwalkan" },
  IN_PROGRESS: { label: "Dikerjakan" },
  COMPLETED: { label: "Selesai" },
  CANCELED: { label: "Dibatalkan" },
};

export function nextMaintenanceStatuses(status: AssetMaintenanceStatusCode): AssetMaintenanceStatusCode[] {
  switch (status) {
    case "REPORTED":
      return ["PLANNED", "IN_PROGRESS", "CANCELED"];
    case "PLANNED":
      return ["IN_PROGRESS", "CANCELED"];
    case "IN_PROGRESS":
      return ["COMPLETED", "CANCELED"];
    case "COMPLETED":
      return ["IN_PROGRESS"];
    case "CANCELED":
      return ["REPORTED"];
  }
}
