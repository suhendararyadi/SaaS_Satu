export const STUDENT_RISK_SOURCES = [
  "ATTENDANCE",
  "STUDENT_AFFAIRS",
  "LEARNING",
  "PKL",
  "FOLLOW_UP",
] as const;

export type StudentRiskSource = (typeof STUDENT_RISK_SOURCES)[number];

export const STUDENT_RISK_LEVELS = ["NORMAL", "WATCH", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type StudentRiskLevel = (typeof STUDENT_RISK_LEVELS)[number];

export const STUDENT_RISK_SOURCE_META: Record<
  StudentRiskSource,
  { label: string; icon: string; cap: number; href: string }
> = {
  ATTENDANCE: { label: "Presensi", icon: "fact_check", cap: 30, href: "/school/attendance" },
  STUDENT_AFFAIRS: { label: "Kesiswaan", icon: "school", cap: 25, href: "/school/student-affairs" },
  LEARNING: { label: "Pembelajaran", icon: "menu_book", cap: 20, href: "/school/lms/courses" },
  PKL: { label: "PKL", icon: "work", cap: 15, href: "/school/pkl/monitoring" },
  FOLLOW_UP: { label: "Tindak Lanjut", icon: "assignment_turned_in", cap: 20, href: "/school/follow-up" },
};

export const STUDENT_RISK_LEVEL_META: Record<
  StudentRiskLevel,
  { label: string; shortLabel: string; minScore: number }
> = {
  NORMAL: { label: "Normal", shortLabel: "Normal", minScore: 0 },
  WATCH: { label: "Perlu Dipantau", shortLabel: "Pantau", minScore: 20 },
  MEDIUM: { label: "Perhatian Sedang", shortLabel: "Sedang", minScore: 40 },
  HIGH: { label: "Risiko Tinggi", shortLabel: "Tinggi", minScore: 60 },
  CRITICAL: { label: "Risiko Kritis", shortLabel: "Kritis", minScore: 80 },
};

export type StudentRiskSignal = {
  id: string;
  source: StudentRiskSource;
  code: string;
  title: string;
  detail: string;
  points: number;
  href: string;
  occurredAt: Date;
  comparableWindow?: "CURRENT" | "PREVIOUS" | null;
};

export type StudentRiskSourceScore = Record<StudentRiskSource, number>;

export function riskLevelFromScore(score: number): StudentRiskLevel {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  if (score >= 20) return "WATCH";
  return "NORMAL";
}

export function scoreSignals(signals: readonly StudentRiskSignal[]) {
  const sourceScores = Object.fromEntries(
    STUDENT_RISK_SOURCES.map((source) => [source, 0]),
  ) as StudentRiskSourceScore;

  for (const signal of signals) {
    sourceScores[signal.source] = Math.min(
      STUDENT_RISK_SOURCE_META[signal.source].cap,
      sourceScores[signal.source] + Math.max(0, signal.points),
    );
  }

  const uncapped = STUDENT_RISK_SOURCES.reduce((sum, source) => sum + sourceScores[source], 0);
  const score = Math.min(100, Math.round(uncapped));

  return {
    score,
    level: riskLevelFromScore(score),
    sourceScores,
  };
}

export function comparableScore(signals: readonly StudentRiskSignal[], window: "CURRENT" | "PREVIOUS") {
  return scoreSignals(signals.filter((signal) => signal.comparableWindow === window)).score;
}

export function riskTrend(current: number, previous: number) {
  const delta = current - previous;
  if (delta >= 8) return { code: "WORSENING" as const, label: "Memburuk", delta };
  if (delta <= -8) return { code: "IMPROVING" as const, label: "Membaik", delta };
  return { code: "STABLE" as const, label: "Stabil", delta };
}

export function sourceContributionOrder(sourceScores: StudentRiskSourceScore) {
  return [...STUDENT_RISK_SOURCES].sort(
    (a, b) => sourceScores[b] - sourceScores[a] || a.localeCompare(b),
  );
}

export function buildRiskRecommendations(sourceScores: StudentRiskSourceScore) {
  const recommendations: Array<{ source: StudentRiskSource; text: string; href: string }> = [];

  if (sourceScores.ATTENDANCE >= 8) {
    recommendations.push({
      source: "ATTENDANCE",
      text: "Verifikasi pola ketidakhadiran/terlambat dan koordinasikan tindak lanjut dengan wali kelas serta pihak terkait.",
      href: "/school/attendance",
    });
  }
  if (sourceScores.STUDENT_AFFAIRS >= 6) {
    recommendations.push({
      source: "STUDENT_AFFAIRS",
      text: "Tinjau catatan kesiswaan dan pembinaan; pastikan kesepakatan atau evaluasi berikutnya terdokumentasi.",
      href: "/school/student-affairs",
    });
  }
  if (sourceScores.LEARNING >= 5) {
    recommendations.push({
      source: "LEARNING",
      text: "Prioritaskan tugas tertunda atau capaian rendah dan koordinasikan dukungan belajar dengan guru mapel.",
      href: "/school/lms/courses",
    });
  }
  if (sourceScores.PKL >= 6) {
    recommendations.push({
      source: "PKL",
      text: "Periksa presensi/jurnal PKL bersama pembimbing sekolah dan mitra sebelum menentukan intervensi.",
      href: "/school/pkl/monitoring",
    });
  }
  if (sourceScores.FOLLOW_UP >= 4) {
    recommendations.push({
      source: "FOLLOW_UP",
      text: "Pastikan kasus tindak lanjut aktif memiliki PIC, tenggat, dan progres yang jelas.",
      href: "/school/follow-up",
    });
  }

  return recommendations.slice(0, 5);
}
