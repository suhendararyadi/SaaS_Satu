import { prisma } from "wasp/server";
import { ensureSchoolUser, requireStudent } from "../school/authGuards";
import { assertAttendanceStudentVisible } from "./access";
import {
  ATTENDANCE_EVIDENCE_MAX_BYTES,
  ATTENDANCE_IMAGE_TYPES,
  readAttendanceEvidence,
  writeAttendanceEvidence,
  type AttendanceImageType,
} from "./evidenceStorage";

async function readRequestBytes(req: any): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) return req.body;
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > ATTENDANCE_EVIDENCE_MAX_BYTES) throw Object.assign(new Error("Foto maksimal 5 MB."), { statusCode: 413 });
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

export const attendanceEvidenceUploadApi = async (req: any, res: any, context: any) => {
  try {
    const student = requireStudent(context);
    const type = String(req.headers["content-type"] || "").split(";", 1)[0].trim() as AttendanceImageType;
    if (!ATTENDANCE_IMAGE_TYPES.includes(type)) return res.status(415).json({ error: "Gunakan JPG, PNG, atau WebP." });
    const bytes = await readRequestBytes(req);
    if (!bytes.length) return res.status(400).json({ error: "File foto kosong." });
    const key = await writeAttendanceEvidence(student.id, type, bytes);
    return res.status(201).json({ key });
  } catch (error: any) {
    return res.status(error?.statusCode || 500).json({ error: error?.message || "Upload selfie gagal." });
  }
};

export const attendanceEvidenceFileApi = async (req: any, res: any, context: any) => {
  try {
    const user = ensureSchoolUser(context);
    const id = String(req.params.id || "");
    const event = await prisma.studentAttendanceEvent.findFirst({
      where: { id, schoolId: user.schoolId },
      select: { studentId: true, evidenceKey: true },
    });
    if (!event?.evidenceKey) return res.status(404).json({ error: "Bukti kehadiran tidak ditemukan." });
    await assertAttendanceStudentVisible(user as any, event.studentId);
    const file = await readAttendanceEvidence(event.evidenceKey);
    if (!file) return res.status(404).json({ error: "File bukti tidak ditemukan." });
    res.setHeader("Content-Type", file.type);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(file.bytes);
  } catch (error: any) {
    return res.status(error?.statusCode || 500).json({ error: error?.message || "Bukti tidak dapat dibuka." });
  }
};
