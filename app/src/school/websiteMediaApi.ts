import { randomUUID } from "node:crypto";
import { prisma } from "wasp/server";
import { ensureFileUploadConfigured } from "../file-upload/config";
import {
  deleteFileFromS3,
  getFileBufferFromS3,
  putBufferToS3,
} from "../file-upload/s3Utils";
import { requireSchoolAdmin } from "./authGuards";
import {
  WEBSITE_MEDIA_MAX_BYTES,
  createWebsiteMediaKey,
  decodeWebsiteMediaHeader,
  isWebsiteMediaKeyForSchool,
  isWebsiteMediaType,
  type WebsiteMediaType,
} from "./websiteMediaPolicy";

const PUBLIC_ORIGIN = "https://sekolah.suhendararyadi.com";

async function readRequestBytes(req: any): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) {
    if (req.body.length > WEBSITE_MEDIA_MAX_BYTES) {
      throw Object.assign(new Error("Ukuran gambar maksimal 5 MB."), {
        statusCode: 413,
      });
    }
    return req.body;
  }

  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > WEBSITE_MEDIA_MAX_BYTES) {
      throw Object.assign(new Error("Ukuran gambar maksimal 5 MB."), {
        statusCode: 413,
      });
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function contentTypeFromRequest(req: any): WebsiteMediaType | null {
  const type = String(req.headers["content-type"] || "")
    .split(";", 1)[0]
    .trim();
  return isWebsiteMediaType(type) ? type : null;
}

export const schoolSiteMediaUploadApi = async (
  req: any,
  res: any,
  context: any,
) => {
  let uploadedKey: string | null = null;
  try {
    const user = requireSchoolAdmin(context);
    ensureFileUploadConfigured();

    const contentType = contentTypeFromRequest(req);
    if (!contentType) {
      return res.status(415).json({ error: "Gunakan JPG, PNG, atau WebP." });
    }

    const altText = decodeWebsiteMediaHeader(req.headers["x-media-alt"], 240);
    const caption =
      decodeWebsiteMediaHeader(req.headers["x-media-caption"], 400) || null;
    if (altText.length < 3) {
      return res.status(400).json({ error: "Alt text minimal 3 karakter." });
    }

    const bytes = await readRequestBytes(req);
    if (!bytes.length) {
      return res.status(400).json({ error: "File gambar kosong." });
    }

    uploadedKey = createWebsiteMediaKey(user.schoolId, contentType);
    await putBufferToS3({
      s3Key: uploadedKey,
      bytes,
      contentType,
    });

    const mediaId = randomUUID();
    const url = `${PUBLIC_ORIGIN}/site-media/${mediaId}`;
    const media = await prisma.schoolSiteMedia.create({
      data: {
        id: mediaId,
        schoolId: user.schoolId,
        fileId: uploadedKey,
        url,
        altText,
        caption,
        createdById: user.id,
      },
    });

    await prisma.schoolSiteRevision.create({
      data: {
        schoolId: user.schoolId,
        resourceType: "MEDIA",
        resourceId: media.id,
        action: "UPLOAD_MEDIA_OBJECT_STORAGE",
        snapshot: JSON.parse(JSON.stringify(media)),
        createdById: user.id,
      },
    });

    return res.status(201).json({ media });
  } catch (error: any) {
    if (uploadedKey) {
      try {
        await deleteFileFromS3({ s3Key: uploadedKey });
      } catch {
        // Best-effort cleanup. The primary error is returned below.
      }
    }
    return res.status(error?.statusCode || 500).json({
      error: error?.message || "Upload media website gagal.",
    });
  }
};

export const schoolSiteMediaFileApi = async (req: any, res: any, _context?: unknown) => {
  try {
    ensureFileUploadConfigured();
    const mediaId = String(req.params.mediaId || "");
    if (!mediaId) {
      return res.status(400).json({ error: "ID media tidak valid." });
    }

    const media = await prisma.schoolSiteMedia.findUnique({
      where: { id: mediaId },
      select: {
        fileId: true,
        schoolId: true,
      },
    });
    if (
      !media?.fileId ||
      !isWebsiteMediaKeyForSchool(media.fileId, media.schoolId)
    ) {
      return res.status(404).json({ error: "Media tidak ditemukan." });
    }

    const stored = await getFileBufferFromS3({ s3Key: media.fileId });
    if (!stored) {
      return res.status(404).json({ error: "File media tidak ditemukan." });
    }
    if (!isWebsiteMediaType(stored.contentType)) {
      return res.status(415).json({ error: "Tipe media tidak didukung." });
    }

    res.setHeader("Content-Type", stored.contentType);
    res.setHeader("Content-Length", String(stored.bytes.length));
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    if (stored.etag) res.setHeader("ETag", stored.etag);
    return res.status(200).send(stored.bytes);
  } catch (error: any) {
    const name = String(error?.name || "");
    if (name === "NoSuchKey" || name === "NotFound") {
      return res.status(404).json({ error: "File media tidak ditemukan." });
    }
    return res.status(error?.statusCode || 500).json({
      error: error?.message || "Media website tidak dapat dibuka.",
    });
  }
};
