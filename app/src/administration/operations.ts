import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ensureSchoolUser } from "../school/authGuards";
import {
  ADMINISTRATION_ALLOWED_VARIABLES,
  ADMINISTRATION_STARTER_REGISTER,
  ADMINISTRATION_STARTER_TEMPLATES,
} from "./starterTemplates";

function isAdmin(user: User) {
  return !!user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";
}

async function resolveAdministrationAccess(user: ReturnType<typeof ensureSchoolUser>) {
  if (isAdmin(user as User)) {
    return { canView: true, canManageTemplates: true, canManageDocuments: true, scope: "ADMIN" as const };
  }
  if (user.role !== "TEACHER") throw new HttpError(403, "Modul Tata Usaha hanya tersedia untuk petugas sekolah yang ditugaskan.");

  const assignments = await prisma.schoolStaffAssignment.findMany({
    where: { schoolId: user.schoolId, teacherId: user.id, isActive: true },
    select: { role: true, customTitle: true, unitName: true },
  });
  const principal = assignments.some((row) => row.role === "PRINCIPAL");
  const administration = assignments.some((row) => {
    const text = `${row.customTitle || ""} ${row.unitName || ""}`.toLowerCase();
    return row.role === "OTHER" && (text.includes("administrasi") || text.includes("tata usaha"));
  });
  if (!principal && !administration) throw new HttpError(403, "Anda belum memiliki penugasan Tata Usaha pada unit sekolah ini.");
  return {
    canView: true,
    canManageTemplates: administration,
    canManageDocuments: principal || administration,
    scope: principal ? ("PRINCIPAL" as const) : ("ADMINISTRATION" as const),
  };
}

async function requireTemplateManager(user: ReturnType<typeof ensureSchoolUser>) {
  const access = await resolveAdministrationAccess(user);
  if (!access.canManageTemplates) throw new HttpError(403, "Hanya Admin sekolah atau petugas Tata Usaha yang dapat mengubah template.");
  return access;
}

async function requireDocumentManager(user: ReturnType<typeof ensureSchoolUser>) {
  const access = await resolveAdministrationAccess(user);
  if (!access.canManageDocuments) throw new HttpError(403, "Anda tidak memiliki akses untuk mengelola draft surat.");
  return access;
}

function sanitizeTemplateHtml(input: string) {
  const allowed = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h1", "h2", "h3", "h4", "blockquote", "table", "thead", "tbody", "tr", "th", "td", "div", "span"]);
  return input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|form|input|button)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|input|button)[^>]*\/?\s*>/gi, "")
    .replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (match, tag: string) => {
      const normalized = tag.toLowerCase();
      if (!allowed.has(normalized)) return "";
      return match.startsWith("</") ? `</${normalized}>` : normalized === "br" ? "<br>" : `<${normalized}>`;
    });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("\n", "<br>");
}

function getPathValue(source: Record<string, any>, path: string) {
  return path.split(".").reduce<any>((value, key) => value?.[key], source);
}

function renderBody(template: string, variables: Record<string, any>) {
  return sanitizeTemplateHtml(template).replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_all, key: string) => escapeHtml(getPathValue(variables, key) ?? "—"));
}

function renderPlain(template: string, variables: Record<string, any>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_all, key: string) => String(getPathValue(variables, key) ?? "—")).replace(/[<>]/g, "");
}

function manualFieldKeys(variableSchema: any): string[] {
  const fields = Array.isArray(variableSchema?.fields) ? variableSchema.fields : [];
  return fields.map((field: any) => String(field?.key || "")).filter((key: string) => key.startsWith("manual."));
}

function validateTemplateVariables(bodyHtml: string, subjectTemplate: string | null | undefined, variableSchema: any) {
  const allowed = new Set<string>([...ADMINISTRATION_ALLOWED_VARIABLES, ...manualFieldKeys(variableSchema)]);
  const text = `${bodyHtml}\n${subjectTemplate || ""}`;
  const used = [...text.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)].map((match) => match[1]);
  const invalid = [...new Set(used.filter((key) => !allowed.has(key)))];
  if (invalid.length) throw new HttpError(400, `Variable template tidak diizinkan: ${invalid.join(", ")}`);
}

async function audit(input: { schoolId: string; actorId?: string | null; documentId?: string | null; action: any; summary: string; metadata?: any }) {
  await prisma.administrationAuditEvent.create({ data: input });
}

export const initializeAdministrationModule = async (_rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  await requireTemplateManager(user);
  let created = 0;

  await prisma.$transaction(async (tx) => {
    for (const starter of ADMINISTRATION_STARTER_TEMPLATES) {
      const exists = await tx.administrationTemplate.findUnique({ where: { schoolId_code: { schoolId: user.schoolId, code: starter.code } }, select: { id: true } });
      if (exists) continue;
      await tx.administrationTemplate.create({
        data: {
          schoolId: user.schoolId,
          code: starter.code,
          name: starter.name,
          category: starter.category,
          description: starter.description,
          status: "ACTIVE",
          currentVersion: 1,
          isStarter: true,
          createdById: user.id,
          versions: {
            create: {
              version: 1,
              subjectTemplate: starter.subjectTemplate,
              bodyHtml: sanitizeTemplateHtml(starter.bodyHtml),
              variableSchema: { fields: starter.manualFields },
              pageConfig: { size: "A4", marginMm: { top: 25, right: 20, bottom: 20, left: 25 }, starter: true },
              createdById: user.id,
            },
          },
        },
      });
      created += 1;
    }
    await tx.letterRegister.upsert({
      where: { schoolId_code: { schoolId: user.schoolId, code: ADMINISTRATION_STARTER_REGISTER.code } },
      create: {
        schoolId: user.schoolId,
        code: ADMINISTRATION_STARTER_REGISTER.code,
        name: ADMINISTRATION_STARTER_REGISTER.name,
        direction: "OUTGOING",
        pattern: ADMINISTRATION_STARTER_REGISTER.pattern,
        resetPolicy: ADMINISTRATION_STARTER_REGISTER.resetPolicy,
        isConfigured: false,
        isActive: true,
      },
      update: {},
    });
  });

  if (created > 0) await audit({ schoolId: user.schoolId, actorId: user.id, action: "MODULE_INITIALIZED", summary: `Kerangka TU diinisialisasi dengan ${created} template starter.` });
  return { ok: true, created };
};

export const getAdministrationWorkspace = async (_rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const access = await resolveAdministrationAccess(user);
  const [school, templates, registers, documents, statusGroups, recentAudit] = await Promise.all([
    prisma.school.findUnique({ where: { id: user.schoolId }, select: { id: true, name: true, npsn: true, address: true, city: true, province: true, phone: true, email: true, logoUrl: true } }),
    prisma.administrationTemplate.findMany({
      where: { schoolId: user.schoolId },
      select: { id: true, code: true, name: true, category: true, description: true, status: true, currentVersion: true, isStarter: true, updatedAt: true, versions: { orderBy: { version: "desc" }, take: 1, select: { id: true, version: true, subjectTemplate: true, bodyHtml: true, variableSchema: true, pageConfig: true, createdAt: true } } },
      orderBy: [{ status: "asc" }, { category: "asc" }, { name: "asc" }],
    }),
    prisma.letterRegister.findMany({ where: { schoolId: user.schoolId }, orderBy: { name: "asc" } }),
    prisma.administrationDocument.findMany({
      where: { schoolId: user.schoolId },
      select: { id: true, title: true, subject: true, recipientName: true, status: true, direction: true, documentNumber: true, revision: true, createdAt: true, updatedAt: true, template: { select: { id: true, code: true, name: true, category: true } }, createdBy: { select: { id: true, name: true, email: true } } },
      orderBy: { updatedAt: "desc" }, take: 100,
    }),
    prisma.administrationDocument.groupBy({ by: ["status"], where: { schoolId: user.schoolId }, _count: { _all: true } }),
    prisma.administrationAuditEvent.findMany({ where: { schoolId: user.schoolId }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, action: true, summary: true, createdAt: true, actor: { select: { id: true, name: true } } } }),
  ]);

  return {
    access,
    school,
    initialized: templates.length > 0,
    templates,
    registers,
    documents,
    statusCounts: Object.fromEntries(statusGroups.map((row) => [row.status, row._count._all])),
    recentAudit,
    starterMode: { officialIssuingEnabled: false, message: "Mode starter aktif. Nomor final, tanda tangan resmi, dan penerbitan surat belum diaktifkan sampai aturan sekolah dikonfigurasi." },
  };
};

export const getAdministrationStudentOptions = async (_rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  await resolveAdministrationAccess(user);
  return prisma.user.findMany({
    where: { schoolId: user.schoolId, role: "STUDENT" },
    select: { id: true, name: true, username: true, studentProfile: { select: { nis: true, nisn: true } }, classRoom: { select: { name: true, department: { select: { name: true } }, academicYear: { select: { yearName: true, semester: true } } } } },
    orderBy: [{ classRoom: { name: "asc" } }, { name: "asc" }],
    take: 2500,
  });
};

const saveTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(3).max(160),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).nullable().optional(),
  subjectTemplate: z.string().trim().max(300).nullable().optional(),
  bodyHtml: z.string().trim().min(5).max(50000),
  variableSchema: z.any(),
});

export const saveAdministrationTemplate = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  await requireTemplateManager(user);
  const args = ensureArgsSchemaOrThrowHttpError(saveTemplateSchema, rawArgs);
  validateTemplateVariables(args.bodyHtml, args.subjectTemplate, args.variableSchema);
  const template = await prisma.administrationTemplate.findFirst({ where: { id: args.id, schoolId: user.schoolId }, select: { id: true, currentVersion: true } });
  if (!template) throw new HttpError(404, "Template surat tidak ditemukan.");
  const nextVersion = template.currentVersion + 1;
  const bodyHtml = sanitizeTemplateHtml(args.bodyHtml);
  const result = await prisma.$transaction(async (tx) => {
    const version = await tx.administrationTemplateVersion.create({ data: { templateId: template.id, version: nextVersion, subjectTemplate: args.subjectTemplate || null, bodyHtml, variableSchema: args.variableSchema, pageConfig: { size: "A4", marginMm: { top: 25, right: 20, bottom: 20, left: 25 } }, createdById: user.id } });
    const updated = await tx.administrationTemplate.update({ where: { id: template.id }, data: { name: args.name, category: args.category, description: args.description || null, currentVersion: nextVersion } });
    return { updated, version };
  });
  await audit({ schoolId: user.schoolId, actorId: user.id, action: "TEMPLATE_VERSION_CREATED", summary: `Template ${args.name} diperbarui ke versi ${nextVersion}.`, metadata: { templateId: template.id, version: nextVersion } });
  return result;
};

const templateStatusSchema = z.object({ id: z.string().uuid(), status: z.enum(["ACTIVE", "ARCHIVED"]) });
export const setAdministrationTemplateStatus = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context); await requireTemplateManager(user);
  const args = ensureArgsSchemaOrThrowHttpError(templateStatusSchema, rawArgs);
  const existing = await prisma.administrationTemplate.findFirst({ where: { id: args.id, schoolId: user.schoolId }, select: { id: true, name: true } });
  if (!existing) throw new HttpError(404, "Template tidak ditemukan.");
  const updated = await prisma.administrationTemplate.update({ where: { id: existing.id }, data: { status: args.status } });
  await audit({ schoolId: user.schoolId, actorId: user.id, action: "TEMPLATE_STATUS_CHANGED", summary: `Status template ${existing.name} diubah menjadi ${args.status}.`, metadata: { templateId: existing.id, status: args.status } });
  return updated;
};

const draftSchema = z.object({
  templateId: z.string().uuid(),
  relatedStudentId: z.string().uuid().nullable().optional(),
  subject: z.string().trim().max(300).nullable().optional(),
  recipientName: z.string().trim().max(240).nullable().optional(),
  recipientAddress: z.string().trim().max(1000).nullable().optional(),
  manualData: z.record(z.string(), z.any()).default({}),
  notes: z.string().trim().max(2000).nullable().optional(),
});

async function resolveDraftVariables(schoolId: string, args: z.infer<typeof draftSchema>) {
  const [school, student] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, npsn: true, address: true, city: true, province: true, phone: true, email: true } }),
    args.relatedStudentId ? prisma.user.findFirst({ where: { id: args.relatedStudentId, schoolId, role: "STUDENT" }, select: { id: true, name: true, studentProfile: { select: { nis: true, nisn: true } }, classRoom: { select: { name: true, department: { select: { name: true } }, academicYear: { select: { yearName: true, semester: true } } } } } }) : null,
  ]);
  if (!school) throw new HttpError(404, "Sekolah tidak ditemukan.");
  if (args.relatedStudentId && !student) throw new HttpError(400, "Siswa tidak valid untuk sekolah ini.");
  const manual: Record<string, any> = {};
  for (const [key, value] of Object.entries(args.manualData || {})) manual[key.replace(/^manual\./, "")] = value;
  return {
    school,
    student: { name: student?.name || "", nis: student?.studentProfile?.nis || "", nisn: student?.studentProfile?.nisn || "", className: student?.classRoom?.name || "", department: student?.classRoom?.department?.name || "" },
    academicYear: { yearName: student?.classRoom?.academicYear?.yearName || "", semester: student?.classRoom?.academicYear?.semester || "" },
    document: { subject: args.subject || "", date: new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" }).format(new Date()), recipientName: args.recipientName || "", recipientAddress: args.recipientAddress || "" },
    manual,
  };
}

export const createAdministrationDraft = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context); await requireDocumentManager(user);
  const args = ensureArgsSchemaOrThrowHttpError(draftSchema, rawArgs);
  const template = await prisma.administrationTemplate.findFirst({
    where: { id: args.templateId, schoolId: user.schoolId, status: "ACTIVE" },
    select: { id: true, name: true, currentVersion: true, versions: { orderBy: { version: "desc" }, take: 1, select: { id: true, version: true, subjectTemplate: true, bodyHtml: true, variableSchema: true } } },
  });
  const version = template?.versions[0];
  if (!template || !version) throw new HttpError(404, "Template aktif tidak ditemukan.");
  const fields = Array.isArray((version.variableSchema as any)?.fields) ? (version.variableSchema as any).fields : [];
  const missing = fields.filter((field: any) => field.required && !String(args.manualData?.[field.key] ?? "").trim()).map((field: any) => field.label || field.key);
  if (missing.length) throw new HttpError(400, `Field wajib belum diisi: ${missing.join(", ")}`);
  const variables = await resolveDraftVariables(user.schoolId, args);
  const renderedSubject = args.subject || (version.subjectTemplate ? renderPlain(version.subjectTemplate, variables) : template.name);
  variables.document.subject = renderedSubject;
  const renderedHtml = renderBody(version.bodyHtml, variables);
  const document = await prisma.administrationDocument.create({
    data: { schoolId: user.schoolId, templateId: template.id, templateVersionId: version.id, status: "DRAFT", direction: "OUTGOING", title: template.name, subject: renderedSubject, recipientName: args.recipientName || null, recipientAddress: args.recipientAddress || null, relatedStudentId: args.relatedStudentId || null, manualData: args.manualData, variableSnapshot: variables, renderedHtml, notes: args.notes || null, createdById: user.id, updatedById: user.id },
  });
  await audit({ schoolId: user.schoolId, actorId: user.id, documentId: document.id, action: "DOCUMENT_CREATED", summary: `Draft ${template.name} dibuat.`, metadata: { templateId: template.id, templateVersion: version.version } });
  return document;
};

const documentIdSchema = z.object({ id: z.string().uuid() });
export const getAdministrationDocument = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context); await resolveAdministrationAccess(user);
  const args = ensureArgsSchemaOrThrowHttpError(documentIdSchema, rawArgs);
  const document = await prisma.administrationDocument.findFirst({ where: { id: args.id, schoolId: user.schoolId }, include: { template: { select: { code: true, name: true, category: true } }, templateVersion: { select: { version: true, variableSchema: true, pageConfig: true } }, relatedStudent: { select: { id: true, name: true, studentProfile: { select: { nis: true, nisn: true } }, classRoom: { select: { name: true } } } }, createdBy: { select: { id: true, name: true, email: true } }, auditEvents: { orderBy: { createdAt: "desc" }, take: 50, include: { actor: { select: { id: true, name: true } } } } } });
  if (!document) throw new HttpError(404, "Draft surat tidak ditemukan.");
  return { document, officialIssuingEnabled: false };
};

const updateStatusSchema = z.object({ id: z.string().uuid(), status: z.enum(["DRAFT", "IN_REVIEW", "RETURNED_FOR_REVISION", "APPROVED", "VOID"]), expectedUpdatedAt: z.string().datetime(), note: z.string().trim().max(1000).nullable().optional() });
const ALLOWED_TRANSITIONS: Record<string, string[]> = { DRAFT: ["IN_REVIEW", "VOID"], IN_REVIEW: ["RETURNED_FOR_REVISION", "APPROVED", "VOID"], RETURNED_FOR_REVISION: ["DRAFT", "IN_REVIEW", "VOID"], APPROVED: ["VOID"], VOID: [] };
export const updateAdministrationDocumentStatus = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context); await requireDocumentManager(user);
  const args = ensureArgsSchemaOrThrowHttpError(updateStatusSchema, rawArgs);
  const existing = await prisma.administrationDocument.findFirst({ where: { id: args.id, schoolId: user.schoolId }, select: { id: true, status: true, updatedAt: true, title: true } });
  if (!existing) throw new HttpError(404, "Draft surat tidak ditemukan.");
  if (!ALLOWED_TRANSITIONS[existing.status]?.includes(args.status)) throw new HttpError(400, `Transisi ${existing.status} → ${args.status} tidak diizinkan.`);
  const result = await prisma.administrationDocument.updateMany({ where: { id: existing.id, schoolId: user.schoolId, updatedAt: new Date(args.expectedUpdatedAt) }, data: { status: args.status, updatedById: user.id, revision: { increment: 1 } } });
  if (result.count !== 1) throw new HttpError(409, "Draft telah berubah. Muat ulang sebelum mengubah status.");
  const updated = await prisma.administrationDocument.findUniqueOrThrow({ where: { id: existing.id } });
  await audit({ schoolId: user.schoolId, actorId: user.id, documentId: existing.id, action: "DOCUMENT_STATUS_CHANGED", summary: `Status ${existing.title} diubah ${existing.status} → ${args.status}.`, metadata: { from: existing.status, to: args.status, note: args.note || null } });
  return updated;
};
