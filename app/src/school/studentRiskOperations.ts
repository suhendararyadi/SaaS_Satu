import { HttpError, prisma } from "wasp/server";
import type { User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ensureSchoolUser } from "./authGuards";
import { buildStudentRiskOverview } from "./studentRiskService";
import { defaultFollowUpDueDate } from "./followUp";

export const getUnifiedStudentRiskData = async (
  _rawArgs: unknown,
  context: { user?: User },
) => {
  const user = ensureSchoolUser(context);
  return buildStudentRiskOverview(user);
};

const ensureRiskFollowUpSchema = z.object({
  studentId: z.string().uuid(),
});

function caseSeverity(level: string) {
  if (level === "CRITICAL") return "CRITICAL" as const;
  if (level === "HIGH") return "HIGH" as const;
  return "MEDIUM" as const;
}

export const ensureUnifiedRiskFollowUp = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const user = ensureSchoolUser(context);
  const args = ensureArgsSchemaOrThrowHttpError(ensureRiskFollowUpSchema, rawArgs);
  const overview = await buildStudentRiskOverview(user);
  const profile = overview.profiles.find((item: any) => item.student.id === args.studentId);

  if (!profile) {
    throw new HttpError(404, "Profil risiko siswa tidak ditemukan dalam lingkup akses Anda.");
  }
  if (profile.accessMode !== "FULL") {
    throw new HttpError(
      403,
      "Tindak lanjut EWS terpadu hanya dapat dibuat dari profil dengan akses sekolah penuh.",
    );
  }
  if (profile.score < 40) {
    throw new HttpError(
      400,
      "Skor risiko belum mencapai tingkat Perhatian Sedang untuk dibuatkan tindak lanjut EWS terpadu.",
    );
  }

  const severity = caseSeverity(profile.level);
  const sourceKey = `ews2:student:${profile.student.id}`;
  const topSignals = profile.signals.slice(0, 4);
  const signalSummary = topSignals.length
    ? topSignals.map((item: any) => `${item.title} (+${item.points})`).join("; ")
    : "Tidak ada faktor dominan.";
  const description =
    `Skor risiko terpadu ${profile.score}/100 (${profile.level}). ` +
    `Faktor utama: ${signalSummary}`;

  const kesiswaan = await prisma.wakasekAssignment.findFirst({
    where: {
      schoolId: user.schoolId,
      role: "KESISWAAN",
    },
    orderBy: { createdAt: "asc" },
    select: { teacherId: true },
  });
  const student = await prisma.user.findFirst({
    where: {
      id: profile.student.id,
      schoolId: user.schoolId,
      role: "STUDENT",
    },
    select: {
      id: true,
      classRoom: { select: { homeroomTeacherId: true } },
    },
  });
  if (!student) throw new HttpError(404, "Data siswa tidak ditemukan.");

  const assignedToId = student.classRoom?.homeroomTeacherId || kesiswaan?.teacherId || null;
  const metadata = {
    engine: "EWS_GEN2",
    riskScore: profile.score,
    riskLevel: profile.level,
    sourceScores: profile.sourceScores,
    trend: profile.trend,
    generatedAt: overview.generatedAt,
  };

  const existing = await prisma.schoolFollowUpCase.findUnique({
    where: {
      schoolId_sourceType_sourceKey: {
        schoolId: user.schoolId,
        sourceType: "SYSTEM",
        sourceKey,
      },
    },
    select: {
      id: true,
      status: true,
      assignedToId: true,
      dueAt: true,
    },
  });

  if (existing) {
    const wasClosed = existing.status === "RESOLVED" || existing.status === "CANCELED";
    const nextStatus = wasClosed
      ? "IN_PROGRESS"
      : existing.status === "FINDING" && (existing.assignedToId || assignedToId)
        ? "ASSIGNED"
        : existing.status;

    await prisma.$transaction(async (tx) => {
      await tx.schoolFollowUpCase.update({
        where: { id: existing.id },
        data: {
          title: `EWS Terpadu · ${profile.student.displayName}`,
          description,
          severity,
          sourceUrl: `/school/ews?student=${profile.student.id}`,
          subjectStudentId: profile.student.id,
          assignedToId: existing.assignedToId || assignedToId,
          status: nextStatus,
          dueAt: wasClosed
            ? defaultFollowUpDueDate(severity)
            : existing.dueAt || defaultFollowUpDueDate(severity),
          resolvedAt: wasClosed ? null : undefined,
          resolvedById: wasClosed ? null : undefined,
          resolutionNote: wasClosed ? null : undefined,
          metadata: metadata as any,
        },
      });

      await tx.schoolFollowUpEvent.create({
        data: {
          caseId: existing.id,
          actorId: user.id,
          type: wasClosed ? "STATUS_CHANGED" : "UPDATED",
          fromStatus: existing.status,
          toStatus: nextStatus,
          note: wasClosed
            ? "Kasus EWS terpadu dibuka kembali berdasarkan profil risiko terbaru."
            : "Profil risiko EWS terpadu disegarkan dari sumber operasional.",
          metadata: metadata as any,
        },
      });

      if (!existing.assignedToId && assignedToId) {
        await tx.schoolFollowUpEvent.create({
          data: {
            caseId: existing.id,
            actorId: user.id,
            type: "ASSIGNED",
            fromStatus: existing.status,
            toStatus: nextStatus,
            note: "PIC ditetapkan berdasarkan Wali Kelas atau Wakasek Kesiswaan.",
            metadata: { assignedToId } as any,
          },
        });
      }
    });

    return { id: existing.id, created: false, reopened: wasClosed };
  }

  const created = await prisma.schoolFollowUpCase.create({
    data: {
      schoolId: user.schoolId,
      sourceType: "SYSTEM",
      sourceKey,
      sourceUrl: `/school/ews?student=${profile.student.id}`,
      title: `EWS Terpadu · ${profile.student.displayName}`,
      description,
      severity,
      status: assignedToId ? "ASSIGNED" : "FINDING",
      subjectStudentId: profile.student.id,
      assignedToId,
      createdById: user.id,
      dueAt: defaultFollowUpDueDate(severity),
      metadata: metadata as any,
      events: {
        create: [
          {
            actorId: user.id,
            type: "CREATED",
            toStatus: assignedToId ? "ASSIGNED" : "FINDING",
            note: "Kasus dibuat dari Early Warning System lintas modul generasi kedua.",
            metadata: metadata as any,
          },
          ...(assignedToId
            ? [
                {
                  actorId: user.id,
                  type: "ASSIGNED" as const,
                  toStatus: "ASSIGNED" as const,
                  note: "PIC ditetapkan berdasarkan Wali Kelas atau Wakasek Kesiswaan.",
                  metadata: { assignedToId } as any,
                },
              ]
            : []),
        ],
      },
    },
    select: { id: true },
  });

  return { id: created.id, created: true, reopened: false };
};
