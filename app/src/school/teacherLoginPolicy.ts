type TeacherLoginSource = {
  id: string;
  username?: string | null;
  nip?: string | null;
  email?: string | null;
  forceIdSuffix?: boolean;
};

function safeLocalPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+|[._-]+$/g, "");
}

function normalizedEmail(value: string | null | undefined): string | null {
  const email = value?.trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  return email;
}

export function buildTeacherTemporaryLoginEmail(input: TeacherLoginSource): string {
  if (!input.forceIdSuffix) {
    const officialEmail = normalizedEmail(input.email);
    if (officialEmail) return officialEmail;
  }

  const base =
    safeLocalPart(input.nip || "") ||
    safeLocalPart(input.username || "") ||
    safeLocalPart(input.email?.split("@")[0] || "") ||
    safeLocalPart(input.id.slice(0, 12)) ||
    "teacher";

  const suffix = input.forceIdSuffix
    ? "-" + safeLocalPart(input.id.slice(0, 8))
    : "";

  return base + suffix + "@staff.schoolos.invalid";
}
