export const WAKASEK_ROLES = ["KURIKULUM", "KESISWAAN", "SARPRAS", "HUMAS_HUBIN"] as const;

export type WakasekRoleCode = (typeof WAKASEK_ROLES)[number];

export const WAKASEK_ROLE_META: Record<WakasekRoleCode, {
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  tone: "blue" | "orange" | "green" | "teal";
}> = {
  KURIKULUM: {
    label: "Waka Kurikulum",
    shortLabel: "Kurikulum",
    icon: "menu_book",
    description: "Supervisi pembelajaran, agenda mengajar, dan keterlaksanaan KBM.",
    tone: "blue",
  },
  KESISWAAN: {
    label: "Waka Kesiswaan",
    shortLabel: "Kesiswaan",
    icon: "groups",
    description: "Kehadiran, kedisiplinan, dan pemantauan kondisi siswa.",
    tone: "orange",
  },
  SARPRAS: {
    label: "Waka Sarpras",
    shortLabel: "Sarpras",
    icon: "domain",
    description: "Kesiapan rombel, ruang belajar, dan struktur layanan sekolah.",
    tone: "green",
  },
  HUMAS_HUBIN: {
    label: "Waka Humas / Hubin",
    shortLabel: "Humas / Hubin",
    icon: "handshake",
    description: "Kemitraan DUDI, PKL, dan kanal publikasi sekolah.",
    tone: "teal",
  },
};

export function isWakasekRole(value: unknown): value is WakasekRoleCode {
  return typeof value === "string" && (WAKASEK_ROLES as readonly string[]).includes(value);
}

export function normalizeWakasekRoles(values: unknown): WakasekRoleCode[] {
  if (!Array.isArray(values)) return [];
  return WAKASEK_ROLES.filter((role) => values.includes(role));
}

export function wakasekRoleLabel(role: WakasekRoleCode): string {
  return WAKASEK_ROLE_META[role].label;
}

export function parseWakasekRolesText(value: string): WakasekRoleCode[] {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return [];
  if (["ya", "true", "1"].includes(normalized)) return ["KURIKULUM"];

  const found = new Set<WakasekRoleCode>();
  for (const token of normalized.split(/[;,|/]+/).map((part) => part.trim()).filter(Boolean)) {
    if (token.includes("kurik")) found.add("KURIKULUM");
    if (token.includes("kesis") || token.includes("siswa")) found.add("KESISWAAN");
    if (token.includes("sarpras") || token.includes("sarana") || token.includes("prasarana")) found.add("SARPRAS");
    if (token.includes("humas") || token.includes("hubin") || token.includes("industri")) found.add("HUMAS_HUBIN");
  }
  return WAKASEK_ROLES.filter((role) => found.has(role));
}
