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

function hasRenderableValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

function applyConditionalBlocks(template: string, variables: Record<string, any>) {
  let result = template;
  const pattern = /\{\{#(if|unless)\s+([a-zA-Z0-9_.-]+)\}\}([\s\S]*?)\{\{\/(?:if|unless)\}\}/g;
  for (let i = 0; i < 12; i += 1) {
    let changed = false;
    result = result.replace(pattern, (_all, mode: string, key: string, content: string) => {
      changed = true;
      const present = hasRenderableValue(getPathValue(variables, key));
      return mode === "if" ? (present ? content : "") : (!present ? content : "");
    });
    if (!changed) break;
  }
  return result;
}

function renderBody(template: string, variables: Record<string, any>) {
  const conditional = applyConditionalBlocks(template, variables);
  return sanitizeTemplateHtml(conditional).replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_all, key: string) => escapeHtml(getPathValue(variables, key) ?? "—"));
}

function renderPlain(template: string, variables: Record<string, any>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_all, key: string) => String(getPathValue(variables, key) ?? "—")).replace(/[<>]/g, "");
}

function formatStaffDisplayName(name: string | null | undefined, profile: any) {
  const base = String(name || "").trim();
  const front = String(profile?.frontTitle || "").trim();
  const back = String(profile?.backTitle || profile?.title || "").trim();
  return [front, base].filter(Boolean).join(" ") + (back ? `, ${back.replace(/^,\s*/, "")}` : "");
}

async function resolvePrincipalSnapshot(schoolId: string) {
  const assignment = await prisma.schoolStaffAssignment.findFirst({
    where: { schoolId, role: "PRINCIPAL", isActive: true },
    orderBy: [{ startDate: "desc" }, { updatedAt: "desc" }],
    select: {
      customTitle: true, unitName: true,
      teacher: {
        select: {
          id: true, name: true, email: true,
          teacherProfile: { select: { nip: true, frontTitle: true, backTitle: true, title: true, jobTitle: true } },
        },
      },
    },
  });
  if (!assignment) return null;
  const profile = assignment.teacher.teacherProfile;
  return {
    id: assignment.teacher.id,
    name: formatStaffDisplayName(assignment.teacher.name, profile),
    rawName: assignment.teacher.name || "",
    nip: profile?.nip || "",
    title: assignment.customTitle || profile?.jobTitle || "Kepala Sekolah",
    unitName: assignment.unitName || "Pimpinan Sekolah",
  };
}

function manualFieldKeys(variableSchema: any): string[] {
  const fields = Array.isArray(variableSchema?.fields) ? variableSchema.fields : [];
  return fields.map((field: any) => String(field?.key || "")).filter((key: string) => key.startsWith("manual."));
}

function validateTemplateVariables(bodyHtml: string, subjectTemplate: string | null | undefined, variableSchema: any) {
  const allowed = new Set<string>([...ADMINISTRATION_ALLOWED_VARIABLES, ...manualFieldKeys(variableSchema)]);
  const text = `${bodyHtml}\n${subjectTemplate || ""}`;
  const used = [...text.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)].map((match) => match[1]);
  const conditional = [...text.matchAll(/\{\{#(?:if|unless)\s+([a-zA-Z0-9_.-]+)\}\}/g)].map((match) => match[1]);
  const invalid = [...new Set([...used, ...conditional].filter((key) => !allowed.has(key)))];
  if (invalid.length) throw new HttpError(400, `Variable template tidak diizinkan: ${invalid.join(", ")}`);
  const opened = [...text.matchAll(/\{\{#(if|unless)\s+[a-zA-Z0-9_.-]+\}\}/g)].length;
  const closed = [...text.matchAll(/\{\{\/(?:if|unless)\}\}/g)].length;
  if (opened !== closed) throw new HttpError(400, "Blok kondisi template tidak seimbang.");
}

function formatManualDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" }).format(date);
}

function formatManualTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return value;
  const [hour, minute] = value.split(":");
  return `${hour}.${minute} WIB`;
}

function buildFormattedManualData(variableSchema: any, rawData: Record<string, any>) {
  const fields = Array.isArray(variableSchema?.fields) ? variableSchema.fields : [];
  const byKey = new Map(fields.map((field: any) => [String(field?.key || ""), field]));
  const manual: Record<string, any> = {};
  for (const [fullKey, rawValue] of Object.entries(rawData || {})) {
    const key = fullKey.replace(/^manual\./, "");
    const field: any = byKey.get(fullKey);
    const text = String(rawValue ?? "");
    manual[key] = field?.type === "date" ? formatManualDate(text) : field?.type === "time" ? formatManualTime(text) : rawValue;
  }
  return manual;
}

function validateDraftContext(variableSchema: any, args: z.infer<typeof draftSchema>) {
  const context = variableSchema?.context || {};
  if (context.student === "required" && !args.relatedStudentId) throw new HttpError(400, "Template ini memerlukan data siswa.");
  if (context.staff === "required" && !args.relatedStaffId) throw new HttpError(400, "Template ini memerlukan data guru/tendik.");
  if (context.recipient === "required" && !String(args.recipientName || "").trim()) throw new HttpError(400, "Template ini memerlukan penerima/tujuan surat.");
  if (context.recipientAddress === "required" && !String(args.recipientAddress || "").trim()) throw new HttpError(400, "Template ini memerlukan alamat penerima.");
  const requireOneOf = Array.isArray(context.requireOneOf) ? context.requireOneOf : [];
  if (requireOneOf.length) {
    const satisfied = requireOneOf.some((key: string) => key === "student" ? !!args.relatedStudentId : key === "staff" ? !!args.relatedStaffId : false);
    if (!satisfied) throw new HttpError(400, "Pilih minimal satu siswa atau guru/tendik terkait untuk template ini.");
  }
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
              variableSchema: { fields: starter.manualFields, context: starter.context, contentProfile: "GEN2" },
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
  const [school, templates, registers, documents, statusGroups, recentAudit, principal] = await Promise.all([
    prisma.school.findUnique({ where: { id: user.schoolId }, select: { id: true, name: true, npsn: true, address: true, city: true, province: true, phone: true, email: true, logoUrl: true, departments: { orderBy: { name: "asc" }, select: { code: true, name: true } } } }),
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
    resolvePrincipalSnapshot(user.schoolId),
  ]);

  return {
    access,
    school,
    principal,
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

const peopleSearchSchema = z.object({
  query: z.string().trim().min(0).max(100).default(""),
  type: z.enum(["STUDENT", "STAFF"]),
  limit: z.number().int().min(1).max(30).default(15),
});

export const searchAdministrationPeople = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  await resolveAdministrationAccess(user);
  const args = ensureArgsSchemaOrThrowHttpError(peopleSearchSchema, rawArgs);
  const query = args.query.trim();
  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });

  if (args.type === "STUDENT") {
    return prisma.user.findMany({
      where: {
        schoolId: user.schoolId, role: "STUDENT",
        ...(query ? { OR: [
          { name: contains(query) }, { username: contains(query) },
          { studentProfile: { is: { nis: contains(query) } } },
          { studentProfile: { is: { nisn: contains(query) } } },
          { classRoom: { is: { name: contains(query) } } },
        ] } : {}),
      },
      select: { id: true, name: true, username: true, role: true, studentProfile: { select: { nis: true, nisn: true } }, classRoom: { select: { name: true, department: { select: { name: true } } } } },
      orderBy: { name: "asc" }, take: args.limit,
    });
  }

  return prisma.user.findMany({
    where: {
      schoolId: user.schoolId, role: { in: ["TEACHER", "SCHOOL_ADMIN"] },
      ...(query ? { OR: [
        { name: contains(query) }, { username: contains(query) }, { email: contains(query) },
        { teacherProfile: { is: { nip: contains(query) } } },
        { teacherProfile: { is: { nuptk: contains(query) } } },
        { staffAssignments: { some: { isActive: true, OR: [{ customTitle: contains(query) }, { unitName: contains(query) }] } } },
      ] } : {}),
    },
    select: {
      id: true, name: true, username: true, email: true, role: true,
      teacherProfile: { select: { nip: true, nuptk: true, frontTitle: true, backTitle: true, title: true, jobTitle: true } },
      staffAssignments: { where: { isActive: true }, take: 3, select: { role: true, customTitle: true, unitName: true } },
    },
    orderBy: { name: "asc" }, take: args.limit,
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
  relatedStaffId: z.string().uuid().nullable().optional(),
  documentNumber: z.string().trim().min(1).max(160),
  subject: z.string().trim().max(300).nullable().optional(),
  recipientName: z.string().trim().max(240).nullable().optional(),
  recipientAddress: z.string().trim().max(1000).nullable().optional(),
  manualData: z.record(z.string(), z.any()).default({}),
  notes: z.string().trim().max(2000).nullable().optional(),
});

async function resolveDraftVariables(schoolId: string, args: z.infer<typeof draftSchema>, variableSchema: any) {
  const [school, student, staff, principal, activeAcademicYear] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, npsn: true, address: true, city: true, province: true, phone: true, email: true, logoUrl: true, departments: { orderBy: { name: "asc" }, select: { code: true, name: true } } } }),
    args.relatedStudentId ? prisma.user.findFirst({ where: { id: args.relatedStudentId, schoolId, role: "STUDENT" }, select: { id: true, name: true, studentProfile: { select: { nis: true, nisn: true } }, classRoom: { select: { name: true, department: { select: { name: true } }, academicYear: { select: { yearName: true, semester: true } } } } } }) : null,
    args.relatedStaffId ? prisma.user.findFirst({ where: { id: args.relatedStaffId, schoolId, role: { in: ["TEACHER", "SCHOOL_ADMIN"] } }, select: { id: true, name: true, teacherProfile: { select: { nip: true, frontTitle: true, backTitle: true, title: true, jobTitle: true } }, staffAssignments: { where: { isActive: true }, take: 3, select: { customTitle: true, unitName: true, role: true } } } }) : null,
    resolvePrincipalSnapshot(schoolId),
    prisma.academicYear.findFirst({ where: { schoolId, isActive: true }, orderBy: { yearName: "desc" }, select: { yearName: true, semester: true } }),
  ]);
  if (!school) throw new HttpError(404, "Sekolah tidak ditemukan.");
  if (args.relatedStudentId && !student) throw new HttpError(400, "Siswa tidak valid untuk sekolah ini.");
  if (args.relatedStaffId && !staff) throw new HttpError(400, "Guru/tendik tidak valid untuk sekolah ini.");
  const manual = buildFormattedManualData(variableSchema, args.manualData || {});
  const staffAssignment = staff?.staffAssignments?.[0];
  return {
    school,
    student: { name: student?.name || "", nis: student?.studentProfile?.nis || "", nisn: student?.studentProfile?.nisn || "", className: student?.classRoom?.name || "", department: student?.classRoom?.department?.name || "" },
    staff: { name: staff ? formatStaffDisplayName(staff.name, staff.teacherProfile) : "", nip: staff?.teacherProfile?.nip || "", title: staffAssignment?.customTitle || staff?.teacherProfile?.jobTitle || "", unitName: staffAssignment?.unitName || "" },
    principal: principal || { name: "", nip: "", title: "Kepala Sekolah", unitName: "" },
    academicYear: { yearName: student?.classRoom?.academicYear?.yearName || activeAcademicYear?.yearName || "", semester: student?.classRoom?.academicYear?.semester || activeAcademicYear?.semester || "" },
    document: { number: args.documentNumber || "", subject: args.subject || "", date: new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" }).format(new Date()), recipientName: args.recipientName || "", recipientAddress: args.recipientAddress || "" },
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
  const variableSchema = version.variableSchema as any;
  const fields = Array.isArray(variableSchema?.fields) ? variableSchema.fields : [];
  const missing = fields.filter((field: any) => field.required && !String(args.manualData?.[field.key] ?? "").trim()).map((field: any) => field.label || field.key);
  if (missing.length) throw new HttpError(400, `Field wajib belum diisi: ${missing.join(", ")}`);
  validateDraftContext(variableSchema, args);
  const variables = await resolveDraftVariables(user.schoolId, args, variableSchema);
  const renderedSubject = args.subject || (version.subjectTemplate ? renderPlain(version.subjectTemplate, variables) : template.name);
  variables.document.subject = renderedSubject;
  const renderedHtml = renderBody(version.bodyHtml, variables);
  const document = await prisma.administrationDocument.create({
    data: { schoolId: user.schoolId, templateId: template.id, templateVersionId: version.id, status: "DRAFT", direction: "OUTGOING", title: template.name, subject: renderedSubject, recipientName: args.recipientName || null, recipientAddress: args.recipientAddress || null, relatedStudentId: args.relatedStudentId || null, relatedStaffId: args.relatedStaffId || null, documentNumber: args.documentNumber || null, manualData: args.manualData, variableSnapshot: variables, renderedHtml, notes: args.notes || null, createdById: user.id, updatedById: user.id },
  });
  await audit({ schoolId: user.schoolId, actorId: user.id, documentId: document.id, action: "DOCUMENT_CREATED", summary: `Draft ${template.name} dibuat.`, metadata: { templateId: template.id, templateVersion: version.version } });
  return document;
};

const refreshDraftSchema = z.object({ id: z.string().uuid(), expectedUpdatedAt: z.string().datetime() });
export const refreshAdministrationDraftFromLatestTemplate = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context); await requireDocumentManager(user);
  const args = ensureArgsSchemaOrThrowHttpError(refreshDraftSchema, rawArgs);
  const existing = await prisma.administrationDocument.findFirst({
    where: { id: args.id, schoolId: user.schoolId },
    select: {
      id: true, status: true, updatedAt: true, templateId: true, templateVersionId: true,
      relatedStudentId: true, relatedStaffId: true, documentNumber: true, recipientName: true, recipientAddress: true,
      manualData: true, notes: true,
      template: { select: { name: true, currentVersion: true, versions: { orderBy: { version: "desc" }, take: 1, select: { id: true, version: true, subjectTemplate: true, bodyHtml: true, variableSchema: true } } } },
    },
  });
  if (!existing) throw new HttpError(404, "Draft surat tidak ditemukan.");
  if (!(["DRAFT", "RETURNED_FOR_REVISION"] as string[]).includes(existing.status)) throw new HttpError(400, "Hanya draft atau surat yang dikembalikan untuk revisi yang dapat memakai redaksi terbaru.");
  if (existing.updatedAt.getTime() !== new Date(args.expectedUpdatedAt).getTime()) throw new HttpError(409, "Draft telah berubah. Muat ulang sebelum memperbarui redaksi.");
  const version = existing.template.versions[0];
  if (!version) throw new HttpError(404, "Versi template terbaru tidak ditemukan.");
  if (version.id === existing.templateVersionId) return { ok: true, idempotent: true, version: version.version };
  const variableSchema = version.variableSchema as any;
  const draftArgs = {
    templateId: existing.templateId,
    relatedStudentId: existing.relatedStudentId,
    relatedStaffId: existing.relatedStaffId,
    documentNumber: existing.documentNumber || "",
    subject: null,
    recipientName: existing.recipientName,
    recipientAddress: existing.recipientAddress,
    manualData: (existing.manualData || {}) as Record<string, any>,
    notes: existing.notes,
  };
  const parsed = ensureArgsSchemaOrThrowHttpError(draftSchema, draftArgs);
  const fields = Array.isArray(variableSchema?.fields) ? variableSchema.fields : [];
  const missing = fields.filter((field: any) => field.required && !String(parsed.manualData?.[field.key] ?? "").trim()).map((field: any) => field.label || field.key);
  if (missing.length) throw new HttpError(400, `Draft lama belum memiliki field yang sekarang wajib: ${missing.join(", ")}. Buat draft baru atau lengkapi data terlebih dahulu.`);
  validateDraftContext(variableSchema, parsed);
  const variables = await resolveDraftVariables(user.schoolId, parsed, variableSchema);
  const renderedSubject = version.subjectTemplate ? renderPlain(version.subjectTemplate, variables) : existing.template.name;
  variables.document.subject = renderedSubject;
  const renderedHtml = renderBody(version.bodyHtml, variables);
  const result = await prisma.administrationDocument.updateMany({
    where: { id: existing.id, schoolId: user.schoolId, updatedAt: new Date(args.expectedUpdatedAt) },
    data: { templateVersionId: version.id, subject: renderedSubject, variableSnapshot: variables, renderedHtml, updatedById: user.id, revision: { increment: 1 } },
  });
  if (result.count !== 1) throw new HttpError(409, "Draft telah berubah. Muat ulang sebelum memperbarui redaksi.");
  await audit({ schoolId: user.schoolId, actorId: user.id, documentId: existing.id, action: "DOCUMENT_UPDATED", summary: `Draft diperbarui menggunakan redaksi template versi ${version.version}.`, metadata: { templateVersion: version.version, source: "GEN2_REFRESH" } });
  return { ok: true, idempotent: false, version: version.version };
};

const documentIdSchema = z.object({ id: z.string().uuid() });
export const getAdministrationDocument = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context); await resolveAdministrationAccess(user);
  const args = ensureArgsSchemaOrThrowHttpError(documentIdSchema, rawArgs);
  const document = await prisma.administrationDocument.findFirst({ where: { id: args.id, schoolId: user.schoolId }, include: { template: { select: { code: true, name: true, category: true, currentVersion: true, isStarter: true } }, templateVersion: { select: { version: true, variableSchema: true, pageConfig: true } }, relatedStudent: { select: { id: true, name: true, studentProfile: { select: { nis: true, nisn: true } }, classRoom: { select: { name: true } } } }, relatedStaff: { select: { id: true, name: true, teacherProfile: { select: { nip: true, frontTitle: true, backTitle: true, title: true, jobTitle: true } } } }, createdBy: { select: { id: true, name: true, email: true } }, auditEvents: { orderBy: { createdAt: "desc" }, take: 50, include: { actor: { select: { id: true, name: true } } } } } });
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
