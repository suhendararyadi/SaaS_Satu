import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const ATTENDANCE_EVIDENCE_ROOT = process.env.ATTENDANCE_EVIDENCE_LOCAL_DIR || "/home/ubuntu/data/saas-satu/attendance-evidence";
export const ATTENDANCE_EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
export const ATTENDANCE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AttendanceImageType = (typeof ATTENDANCE_IMAGE_TYPES)[number];
const MIME_EXT: Record<AttendanceImageType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const EXT_MIME: Record<string, AttendanceImageType> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export function createAttendanceEvidenceKey(userId: string, type: AttendanceImageType) {
  return `attendance-local:${userId}:${randomUUID()}.${MIME_EXT[type]}`;
}

export function parseAttendanceEvidenceKey(key: string): { ownerId: string; fileName: string; type: AttendanceImageType } | null {
  const match = /^attendance-local:([A-Za-z0-9_-]+):([0-9a-f-]{36})\.(jpg|png|webp)$/i.exec(key);
  if (!match) return null;
  return { ownerId: match[1], fileName: `${match[2]}.${match[3].toLowerCase()}`, type: EXT_MIME[match[3].toLowerCase()] };
}

function evidencePath(key: string) {
  const parsed = parseAttendanceEvidenceKey(key);
  return parsed ? path.join(ATTENDANCE_EVIDENCE_ROOT, parsed.ownerId, parsed.fileName) : null;
}

export async function writeAttendanceEvidence(userId: string, type: AttendanceImageType, bytes: Buffer) {
  if (!bytes.length || bytes.length > ATTENDANCE_EVIDENCE_MAX_BYTES) throw Object.assign(new Error("Ukuran foto maksimal 5 MB."), { statusCode: 413 });
  const key = createAttendanceEvidenceKey(userId, type);
  const parsed = parseAttendanceEvidenceKey(key)!;
  const dir = path.join(ATTENDANCE_EVIDENCE_ROOT, parsed.ownerId);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeFile(path.join(dir, parsed.fileName), bytes, { mode: 0o600, flag: "wx" });
  return key;
}

export async function attendanceEvidenceExists(key: string) {
  const filePath = evidencePath(key);
  if (!filePath) return false;
  try { return (await stat(filePath)).isFile(); } catch { return false; }
}

export async function readAttendanceEvidence(key: string): Promise<{ bytes: Buffer; type: AttendanceImageType } | null> {
  const parsed = parseAttendanceEvidenceKey(key);
  const filePath = evidencePath(key);
  if (!parsed || !filePath) return null;
  try { return { bytes: await readFile(filePath), type: parsed.type }; } catch { return null; }
}
