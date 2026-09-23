import { prisma } from "wasp/server";
import { requirePklAccess } from "../school/authGuards";
import {
  PKL_LOCAL_EVIDENCE_MAX_BYTES,
  PKL_LOCAL_IMAGE_TYPES,
  isLocalEvidenceKey,
  readLocalEvidence,
  writeLocalEvidence,
  type PklLocalImageType,
} from "./localEvidenceStorage";

async function readRequestBytes(req: any): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) return req.body;
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > PKL_LOCAL_EVIDENCE_MAX_BYTES) throw Object.assign(new Error("Foto maksimal 5 MB."), { statusCode: 413 });
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

export const pklEvidenceLocalUploadApi = async (req: any, res: any, context: any) => {
  try {
    const user = requirePklAccess(context);
    const type = String(req.headers["content-type"] || "").split(";", 1)[0].trim() as PklLocalImageType;
    if (!PKL_LOCAL_IMAGE_TYPES.includes(type)) return res.status(415).json({ error: "Gunakan JPG, PNG, atau WebP." });
    const bytes = await readRequestBytes(req);
    if (!bytes.length) return res.status(400).json({ error: "File foto kosong." });
    const key = await writeLocalEvidence(user.id, type, bytes);
    return res.status(201).json({ key });
  } catch (error: any) {
    return res.status(error?.statusCode || 500).json({ error: error?.message || "Upload foto gagal." });
  }
};

export const pklEvidenceLocalFileApi = async (req: any, res: any, context: any) => {
  try {
    const user = requirePklAccess(context);
    const kind = String(req.params.kind || "");
    const id = String(req.params.id || "");
    const scope = user.isAdmin || user.role === "SCHOOL_ADMIN" || user.role === "SUPERADMIN"
      ? {}
      : user.role === "STUDENT" ? { studentId: user.id }
      : user.role === "TEACHER" ? { teacherSupervisorId: user.id }
      : { dudiMentorId: user.id };

    let key: string | null = null;
    if (kind === "ATTENDANCE") {
      const row = await prisma.attendanceLog.findFirst({
        where: { id, placement: { schoolId: user.schoolId, ...scope } },
        select: { photoUrl: true, evidenceUrl: true },
      });
      key = row?.evidenceUrl || row?.photoUrl || null;
    } else if (kind === "JOURNAL") {
      const row = await prisma.dailyJournal.findFirst({
        where: { id, placement: { schoolId: user.schoolId, ...scope } },
        select: { photoUrl: true, evidenceUrl: true },
      });
      key = row?.evidenceUrl || row?.photoUrl || null;
    } else {
      return res.status(400).json({ error: "Jenis bukti tidak valid." });
    }

    if (!key || !isLocalEvidenceKey(key)) return res.status(404).json({ error: "Bukti lokal tidak ditemukan." });
    const file = await readLocalEvidence(key);
    if (!file) return res.status(404).json({ error: "File bukti tidak ditemukan." });
    res.setHeader("Content-Type", file.type);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(file.bytes);
  } catch (error: any) {
    return res.status(error?.statusCode || 500).json({ error: error?.message || "Bukti tidak dapat dibuka." });
  }
};
