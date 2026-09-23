export type SchoolLevelValue = "SD_MI" | "SMP_MTS" | "SMA_SMK";

export type SchoolCapabilities = {
  level: SchoolLevelValue;
  usesDepartments: boolean;
  usesPkl: boolean;
};

const DEFAULT_SCHOOL_LEVEL: SchoolLevelValue = "SMA_SMK";

export function normalizeSchoolLevel(level?: string | null): SchoolLevelValue {
  if (level === "SD_MI" || level === "SMP_MTS" || level === "SMA_SMK") {
    return level;
  }
  return DEFAULT_SCHOOL_LEVEL;
}

export function getSchoolCapabilities(level?: string | null): SchoolCapabilities {
  const normalizedLevel = normalizeSchoolLevel(level);
  const isUpperSecondary = normalizedLevel === "SMA_SMK";

  return {
    level: normalizedLevel,
    usesDepartments: isUpperSecondary,
    usesPkl: isUpperSecondary,
  };
}
