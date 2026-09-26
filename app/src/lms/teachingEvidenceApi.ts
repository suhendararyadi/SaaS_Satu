import { prisma } from "wasp/server";
import {
  ensureSchoolUser,
  requireTeacher,
} from "../school/authGuards";
import {
  ATTENDANCE_EVIDENCE_MAX_BYTES,
  ATTENDANCE_IMAGE_TYPES,
  readAttendanceEvidence,
  writeAttendanceEvidence,
  type AttendanceImageType,
} from "../attendance360/evidenceStorage";
import { assertCanMonitorTeachingCourse } from "./teachingAccess";

async function readRequestBytes(req: any): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) return req.body;
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > ATTENDANCE_EVIDENCE_MAX_BYTES) {
      throw Object.assign(new Error("Foto maksimal 5 MB."), { statusCode: 413 });
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

export const teachingEvidenceUploadApi = async (req: any, res: any, context: any) => {
  try {
    const teacher = requireTeacher(context);
    const type = String(req.headers["content-type"] || "")
      .split(";", 1)[0]
      .trim() as AttendanceImageType;
    if (!ATTENDANCE_IMAGE_TYPES.includes(type)) {
      return res.status(415).json({ error: "Gunakan JPG, PNG, atau WebP." });
    }
    const bytes = await readRequestBytes(req);
    if (!bytes.length) return res.status(400).json({ error: "File foto kosong." });
    const key = await writeAttendanceEvidence(teacher.id, type, bytes);
    return res.status(201).json({ key });
  } catch (error: any) {
    return res.status(error?.statusCode || 500).json({
      error: error?.message || "Upload bukti KBM gagal.",
    });
  }
};

export const teachingEvidenceFileApi = async (req: any, res: any, context: any) => {
  try {
    const user = ensureSchoolUser(context);
    if (user.role !== "TEACHER" && !user.isAdmin && user.role !== "SCHOOL_ADMIN" && user.role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Bukti KBM hanya tersedia untuk guru/pengelola sekolah." });
    }
    const id = String(req.params.id || "");
    const kind = String(req.params.kind || "").toUpperCase();
    if (!["CHECK_IN", "CHECK_OUT"].includes(kind)) {
      return res.status(400).json({ error: "Jenis bukti tidak valid." });
    }
    const session = await prisma.lmsTeachingSession.findFirst({
      where: { id, course: { schoolId: user.schoolId } },
      select: {
        checkInEvidenceKey: true,
        checkOutEvidenceKey: true,
        course: {
          select: {
            teacherId: true,
            classRoom: { select: { departmentId: true } },
          },
        },
      },
    });
    if (!session) return res.status(404).json({ error: "Sesi KBM tidak ditemukan." });
    await assertCanMonitorTeachingCourse(user as any, session.course);
    const key = kind === "CHECK_IN" ? session.checkInEvidenceKey : session.checkOutEvidenceKey;
    if (!key) return res.status(404).json({ error: "Bukti KBM belum tersedia." });
    const file = await readAttendanceEvidence(key);
    if (!file) return res.status(404).json({ error: "File bukti KBM tidak ditemukan." });
    res.setHeader("Content-Type", file.type);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(file.bytes);
  } catch (error: any) {
    return res.status(error?.statusCode || 500).json({
      error: error?.message || "Bukti KBM tidak dapat dibuka.",
    });
  }
};
