/** Domain email internal untuk akun login siswa; tidak dapat menerima surat (`.invalid`). */
export const STUDENT_LOGIN_EMAIL_DOMAIN = "@students.schoolos.invalid";

const NISN_PATTERN = /^\d{10}$/;

/**
 * Email login internal dari NISN yang diketik siswa. Mengembalikan null bila bukan 10 angka,
 * sehingga formulir tidak mengirim permintaan untuk masukan yang pasti salah.
 */
export function studentLoginEmailFromNisn(input: string): string | null {
  const nisn = input.replace(/\s+/g, "");
  return NISN_PATTERN.test(nisn) ? nisn + STUDENT_LOGIN_EMAIL_DOMAIN : null;
}

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

  return base + suffix + STUDENT_LOGIN_EMAIL_DOMAIN;
}
