type StudentLoginSource = {
  id: string;
  username?: string | null;
  nis?: string | null;
  nisn?: string | null;
  forceIdSuffix?: boolean;
};

function safeLocalPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+|[._-]+$/g, "");
}

export function buildStudentTemporaryLoginEmail(input: StudentLoginSource): string {
  const base =
    safeLocalPart(input.nisn || "") ||
    safeLocalPart(input.username || "") ||
    safeLocalPart(input.nis || "") ||
    safeLocalPart(input.id.slice(0, 12)) ||
    "student";

  const suffix = input.forceIdSuffix
    ? "-" + safeLocalPart(input.id.slice(0, 8))
    : "";

  return base + suffix + "@students.schoolos.invalid";
}
