import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const PKL_LOCAL_EVIDENCE_ROOT = process.env.PKL_EVIDENCE_LOCAL_DIR || "/home/ubuntu/data/saas-satu/pkl-evidence";
export const PKL_LOCAL_EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
export const PKL_LOCAL_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PklLocalImageType = (typeof PKL_LOCAL_IMAGE_TYPES)[number];

const MIME_EXT: Record<PklLocalImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const EXT_MIME: Record<string, PklLocalImageType> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export function isLocalEvidenceKey(key?: string | null): boolean {
  return typeof key === "string" && key.startsWith("local:");
}

export function createLocalEvidenceKey(userId: string, type: PklLocalImageType): string {
  return `local:${userId}:${randomUUID()}.${MIME_EXT[type]}`;
}

export function parseLocalEvidenceKey(key: string): { ownerId: string; fileName: string; type: PklLocalImageType } | null {
  const match = /^local:([A-Za-z0-9_-]+):([0-9a-f-]{36})\.(jpg|png|webp)$/i.exec(key);
  if (!match) return null;
  return { ownerId: match[1], fileName: `${match[2]}.${match[3].toLowerCase()}`, type: EXT_MIME[match[3].toLowerCase()] };
}

export function localEvidencePath(key: string): string | null {
  const parsed = parseLocalEvidenceKey(key);
  if (!parsed) return null;
  return path.join(PKL_LOCAL_EVIDENCE_ROOT, parsed.ownerId, parsed.fileName);
}

export async function writeLocalEvidence(userId: string, type: PklLocalImageType, bytes: Buffer): Promise<string> {
  if (bytes.length <= 0 || bytes.length > PKL_LOCAL_EVIDENCE_MAX_BYTES) throw new Error("Ukuran foto tidak valid.");
  const key = createLocalEvidenceKey(userId, type);
  const parsed = parseLocalEvidenceKey(key)!;
  const dir = path.join(PKL_LOCAL_EVIDENCE_ROOT, parsed.ownerId);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeFile(path.join(dir, parsed.fileName), bytes, { mode: 0o600, flag: "wx" });
  return key;
}

export async function localEvidenceExists(key: string): Promise<boolean> {
  const filePath = localEvidencePath(key);
  if (!filePath) return false;
  try { return (await stat(filePath)).isFile(); } catch { return false; }
}

export async function readLocalEvidence(key: string): Promise<{ bytes: Buffer; type: PklLocalImageType } | null> {
  const parsed = parseLocalEvidenceKey(key);
  const filePath = localEvidencePath(key);
  if (!parsed || !filePath) return null;
  try { return { bytes: await readFile(filePath), type: parsed.type }; } catch { return null; }
}
