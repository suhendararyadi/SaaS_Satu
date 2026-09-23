import { HttpError, prisma } from "wasp/server";
import { type User } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { ensureSchoolUser } from "./authGuards";
import { FOLLOW_UP_SEVERITIES, defaultFollowUpDueDate } from "./followUp";
import {
  ASSET_CONDITIONS,
  ASSET_MAINTENANCE_STATUSES,
  ASSET_MOVEMENT_TYPES,
  ASSET_STATUSES,
  nextMaintenanceStatuses,
  type AssetMaintenanceStatusCode,
} from "./sarpras";

function isAdmin(user: User) {
  return !!user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";
}

async function resolveSarprasAccess(user: ReturnType<typeof ensureSchoolUser>) {
  if (isAdmin(user as User)) {
    return { canView: true, canReport: true, canManage: true, scope: "ADMIN" as const };
  }

  if (user.role !== "TEACHER") {
    throw new HttpError(403, "Modul Sarpras hanya tersedia untuk Admin dan Guru.");
  }

  const [waka, principal] = await Promise.all([
    prisma.wakasekAssignment.findFirst({
      where: { schoolId: user.schoolId, teacherId: user.id, role: "SARPRAS" },
      select: { id: true },
    }),
    prisma.schoolStaffAssignment.findFirst({
      where: {
        schoolId: user.schoolId,
        teacherId: user.id,
        role: "PRINCIPAL",
        isActive: true,
      },
      select: { id: true },
    }),
  ]);

  return {
    canView: true,
    canReport: true,
    canManage: !!waka || !!principal,
    scope: waka ? ("SARPRAS" as const) : principal ? ("PRINCIPAL" as const) : ("TEACHER" as const),
  };
}

async function requireManage(user: ReturnType<typeof ensureSchoolUser>) {
  const access = await resolveSarprasAccess(user);
  if (!access.canManage) throw new HttpError(403, "Hanya Admin, Kepala Sekolah, atau Waka Sarpras yang dapat mengubah inventaris.");
  return access;
}

async function ensureSchoolUserRef(schoolId: string, id: string | null | undefined) {
  if (!id) return null;
  const ref = await prisma.user.findFirst({
    where: { id, schoolId, role: { in: ["TEACHER", "SCHOOL_ADMIN"] } },
    select: { id: true },
  });
  if (!ref) throw new HttpError(400, "Penanggung jawab tidak valid untuk sekolah ini.");
  return ref.id;
}

async function ensureRoomRef(schoolId: string, id: string | null | undefined) {
  if (!id) return null;
  const room = await prisma.facilityRoom.findFirst({
    where: { id, schoolId },
    select: { id: true },
  });
  if (!room) throw new HttpError(400, "Ruang/fasilitas tidak valid.");
  return room.id;
}

async function ensureCategoryRef(schoolId: string, id: string | null | undefined) {
  if (!id) return null;
  const category = await prisma.assetCategory.findFirst({
    where: { id, schoolId },
    select: { id: true },
  });
  if (!category) throw new HttpError(400, "Kategori aset tidak valid.");
  return category.id;
}

async function sarprasOwner(schoolId: string) {
  const row = await prisma.wakasekAssignment.findFirst({
    where: { schoolId, role: "SARPRAS" },
    orderBy: { createdAt: "asc" },
    select: { teacherId: true },
  });
  return row?.teacherId || null;
}

const inventorySchema = z.object({
  search: z.string().trim().max(120).optional(),
  condition: z.enum(ASSET_CONDITIONS).optional(),
  status: z.enum(ASSET_STATUSES).optional(),
  roomId: z.string().uuid().optional(),
});

export const getSarprasInventoryData = async (
  rawArgs: unknown,
  context: { user?: User },
) => {
  const user = ensureSchoolUser(context);
  const access = await resolveSarprasAccess(user);
  const args = ensureArgsSchemaOrThrowHttpError(inventorySchema, rawArgs ?? {});

  const where: any = {
    schoolId: user.schoolId,
    ...(args.condition ? { condition: args.condition } : {}),
    ...(args.status ? { status: args.status } : {}),
    ...(args.roomId ? { roomId: args.roomId } : {}),
    ...(args.search
      ? {
          OR: [
            { code: { contains: args.search, mode: "insensitive" } },
            { name: { contains: args.search, mode: "insensitive" } },
            { brand: { contains: args.search, mode: "insensitive" } },
            { model: { contains: args.search, mode: "insensitive" } },
            { serialNumber: { contains: args.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [
    rooms,
    categories,
    assets,
    maintenance,
    movements,
    assignees,
    statusGroups,
    conditionGroups,
    openMaintenance,
    sarprasFollowUps,
  ] = await Promise.all([
    prisma.facilityRoom.findMany({
      where: { schoolId: user.schoolId },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        building: true,
        floor: true,
        notes: true,
        isActive: true,
        responsibleUser: { select: { id: true, name: true } },
        _count: { select: { assets: true } },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.assetCategory.findMany({
      where: { schoolId: user.schoolId },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        _count: { select: { assets: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.assetItem.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        brand: true,
        model: true,
        serialNumber: true,
        quantity: true,
        acquisitionDate: true,
        acquisitionSource: true,
        acquisitionValue: true,
        condition: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { id: true, code: true, name: true } },
        room: { select: { id: true, code: true, name: true } },
        responsibleUser: { select: { id: true, name: true } },
        _count: {
          select: {
            maintenances: {
              where: { status: { in: ["REPORTED", "PLANNED", "IN_PROGRESS"] } },
            },
          },
        },
      },
      orderBy: [{ status: "asc" }, { condition: "desc" }, { name: "asc" }],
      take: 1000,
    }),
    prisma.assetMaintenance.findMany({
      where: { schoolId: user.schoolId },
      select: {
        id: true,
        issue: true,
        priority: true,
        status: true,
        reportedAt: true,
        scheduledAt: true,
        startedAt: true,
        completedAt: true,
        resolutionNote: true,
        vendor: true,
        estimatedCost: true,
        actualCost: true,
        asset: {
          select: {
            id: true,
            code: true,
            name: true,
            condition: true,
            room: { select: { id: true, name: true, code: true } },
          },
        },
        reportedBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { reportedAt: "desc" }],
      take: 300,
    }),
    prisma.assetMovement.findMany({
      where: { schoolId: user.schoolId },
      select: {
        id: true,
        type: true,
        note: true,
        movedAt: true,
        asset: { select: { id: true, code: true, name: true } },
        fromRoom: { select: { id: true, code: true, name: true } },
        toRoom: { select: { id: true, code: true, name: true } },
        performedBy: { select: { id: true, name: true } },
      },
      orderBy: { movedAt: "desc" },
      take: 150,
    }),
    access.canManage
      ? prisma.user.findMany({
          where: { schoolId: user.schoolId, role: { in: ["TEACHER", "SCHOOL_ADMIN"] } },
          select: { id: true, name: true, role: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.assetItem.groupBy({
      by: ["status"],
      where: { schoolId: user.schoolId },
      _count: { _all: true },
      _sum: { quantity: true },
    }),
    prisma.assetItem.groupBy({
      by: ["condition"],
      where: { schoolId: user.schoolId, status: "ACTIVE" },
      _count: { _all: true },
      _sum: { quantity: true },
    }),
    prisma.assetMaintenance.count({
      where: {
        schoolId: user.schoolId,
        status: { in: ["REPORTED", "PLANNED", "IN_PROGRESS"] },
      },
    }),
    prisma.schoolFollowUpCase.findMany({
      where: { schoolId: user.schoolId, sourceType: "SARPRAS" },
      select: { id: true, sourceKey: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const unitByCondition: Record<string, number> = {};
  for (const row of conditionGroups) unitByCondition[row.condition] = row._sum.quantity || 0;

  const totalUnits = statusGroups
    .filter((row) => row.status !== "DISPOSED")
    .reduce((sum, row) => sum + (row._sum.quantity || 0), 0);

  const followUpBySourceKey = new Map(sarprasFollowUps.map((item) => [item.sourceKey, item]));

  return {
    access,
    stats: {
      roomCount: rooms.filter((room) => room.isActive).length,
      assetRecordCount: statusGroups
        .filter((row) => row.status !== "DISPOSED")
        .reduce((sum, row) => sum + row._count._all, 0),
      totalUnits,
      goodUnits: unitByCondition.GOOD || 0,
      attentionUnits:
        (unitByCondition.FAIR || 0) +
        (unitByCondition.DAMAGED || 0) +
        (unitByCondition.LOST || 0) +
        (unitByCondition.MAINTENANCE || 0),
      damagedUnits: unitByCondition.DAMAGED || 0,
      maintenanceUnits: unitByCondition.MAINTENANCE || 0,
      openMaintenance,
    },
    rooms,
    categories,
    assets: assets.map((asset) => ({
      ...asset,
      acquisitionValue: access.canManage ? asset.acquisitionValue?.toString() || null : null,
    })),
    maintenance: maintenance.map((item) => ({
      ...item,
      followUp: followUpBySourceKey.get("maintenance:" + item.id) || null,
      estimatedCost: access.canManage ? item.estimatedCost?.toString() || null : null,
      actualCost: access.canManage ? item.actualCost?.toString() || null : null,
    })),
    movements,
    assignees,
  };
};

const roomSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(160),
  type: z.string().trim().max(100).optional().nullable(),
  building: z.string().trim().max(100).optional().nullable(),
  floor: z.string().trim().max(60).optional().nullable(),
  responsibleUserId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const saveFacilityRoom = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  await requireManage(user);
  const args = ensureArgsSchemaOrThrowHttpError(roomSchema, rawArgs);
  const responsibleUserId = await ensureSchoolUserRef(user.schoolId, args.responsibleUserId);

  if (args.id) {
    const existing = await prisma.facilityRoom.findFirst({ where: { id: args.id, schoolId: user.schoolId }, select: { id: true } });
    if (!existing) throw new HttpError(404, "Ruang/fasilitas tidak ditemukan.");
    return prisma.facilityRoom.update({
      where: { id: args.id },
      data: {
        code: args.code.toUpperCase(),
        name: args.name,
        type: args.type || null,
        building: args.building || null,
        floor: args.floor || null,
        responsibleUserId,
        notes: args.notes || null,
        isActive: args.isActive,
      },
      select: { id: true },
    });
  }

  return prisma.facilityRoom.create({
    data: {
      schoolId: user.schoolId,
      code: args.code.toUpperCase(),
      name: args.name,
      type: args.type || null,
      building: args.building || null,
      floor: args.floor || null,
      responsibleUserId,
      notes: args.notes || null,
      isActive: args.isActive,
    },
    select: { id: true },
  });
};

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const saveAssetCategory = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  await requireManage(user);
  const args = ensureArgsSchemaOrThrowHttpError(categorySchema, rawArgs);

  if (args.id) {
    const existing = await prisma.assetCategory.findFirst({ where: { id: args.id, schoolId: user.schoolId }, select: { id: true } });
    if (!existing) throw new HttpError(404, "Kategori aset tidak ditemukan.");
    return prisma.assetCategory.update({
      where: { id: args.id },
      data: { code: args.code.toUpperCase(), name: args.name, description: args.description || null },
      select: { id: true },
    });
  }

  return prisma.assetCategory.create({
    data: {
      schoolId: user.schoolId,
      code: args.code.toUpperCase(),
      name: args.name,
      description: args.description || null,
    },
    select: { id: true },
  });
};

const assetSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(2).max(180),
  categoryId: z.string().uuid().optional().nullable(),
  roomId: z.string().uuid().optional().nullable(),
  responsibleUserId: z.string().uuid().optional().nullable(),
  brand: z.string().trim().max(120).optional().nullable(),
  model: z.string().trim().max(120).optional().nullable(),
  serialNumber: z.string().trim().max(160).optional().nullable(),
  quantity: z.coerce.number().int().min(1).max(100000).default(1),
  acquisitionDate: z.coerce.date().optional().nullable(),
  acquisitionSource: z.string().trim().max(160).optional().nullable(),
  acquisitionValue: z.coerce.number().min(0).max(999999999999).optional().nullable(),
  condition: z.enum(ASSET_CONDITIONS).default("GOOD"),
  status: z.enum(ASSET_STATUSES).default("ACTIVE"),
  notes: z.string().trim().max(3000).optional().nullable(),
});

export const saveAssetItem = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  await requireManage(user);
  const args = ensureArgsSchemaOrThrowHttpError(assetSchema, rawArgs);
  const [categoryId, responsibleUserId] = await Promise.all([
    ensureCategoryRef(user.schoolId, args.categoryId),
    ensureSchoolUserRef(user.schoolId, args.responsibleUserId),
  ]);

  if (args.id) {
    const existing = await prisma.assetItem.findFirst({
      where: { id: args.id, schoolId: user.schoolId },
      select: { id: true, roomId: true, status: true },
    });
    if (!existing) throw new HttpError(404, "Aset tidak ditemukan.");
    if (args.status === "DISPOSED" && existing.status !== "DISPOSED") {
      throw new HttpError(400, "Penghapusan aset harus dilakukan melalui aksi Pindah > Penghapusan Aset agar histori tercatat.");
    }

    return prisma.assetItem.update({
      where: { id: args.id },
      data: {
        code: args.code.toUpperCase(),
        name: args.name,
        categoryId,
        responsibleUserId,
        brand: args.brand || null,
        model: args.model || null,
        serialNumber: args.serialNumber || null,
        quantity: args.quantity,
        acquisitionDate: args.acquisitionDate || null,
        acquisitionSource: args.acquisitionSource || null,
        acquisitionValue: args.acquisitionValue == null ? null : String(args.acquisitionValue),
        condition: args.condition,
        status: args.status,
        notes: args.notes || null,
      },
      select: { id: true },
    });
  }

  if (args.status === "DISPOSED") {
    throw new HttpError(400, "Aset baru tidak dapat langsung berstatus dihapuskan.");
  }
  const roomId = await ensureRoomRef(user.schoolId, args.roomId);
  return prisma.$transaction(async (tx) => {
    const created = await tx.assetItem.create({
      data: {
        schoolId: user.schoolId,
        code: args.code.toUpperCase(),
        name: args.name,
        categoryId,
        roomId,
        responsibleUserId,
        brand: args.brand || null,
        model: args.model || null,
        serialNumber: args.serialNumber || null,
        quantity: args.quantity,
        acquisitionDate: args.acquisitionDate || null,
        acquisitionSource: args.acquisitionSource || null,
        acquisitionValue: args.acquisitionValue == null ? null : String(args.acquisitionValue),
        condition: args.condition,
        status: args.status,
        notes: args.notes || null,
      },
      select: { id: true },
    });

    await tx.assetMovement.create({
      data: {
        schoolId: user.schoolId,
        assetId: created.id,
        type: "ACQUISITION",
        toRoomId: roomId,
        performedById: user.id,
        note: args.acquisitionSource ? `Perolehan: ${args.acquisitionSource}` : "Aset ditambahkan ke inventaris.",
      },
    });
    return created;
  });
};

const maintenanceSchema = z.object({
  assetId: z.string().uuid(),
  issue: z.string().trim().min(4).max(3000),
  priority: z.enum(FOLLOW_UP_SEVERITIES).default("MEDIUM"),
  assignedToId: z.string().uuid().optional().nullable(),
  observedCondition: z.enum(ASSET_CONDITIONS).optional(),
  scheduledAt: z.coerce.date().optional().nullable(),
  vendor: z.string().trim().max(180).optional().nullable(),
  estimatedCost: z.coerce.number().min(0).max(999999999999).optional().nullable(),
});

export const reportAssetMaintenance = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  const access = await resolveSarprasAccess(user);
  if (!access.canReport) throw new HttpError(403, "Anda tidak dapat melaporkan kerusakan aset.");
  const args = ensureArgsSchemaOrThrowHttpError(maintenanceSchema, rawArgs);

  const asset = await prisma.assetItem.findFirst({
    where: { id: args.assetId, schoolId: user.schoolId },
    select: { id: true, code: true, name: true, condition: true },
  });
  if (!asset) throw new HttpError(404, "Aset tidak ditemukan.");

  const preferredAssignee = access.canManage
    ? await ensureSchoolUserRef(user.schoolId, args.assignedToId)
    : null;
  const assignedToId = preferredAssignee || (await sarprasOwner(user.schoolId));

  return prisma.$transaction(async (tx) => {
    const maintenance = await tx.assetMaintenance.create({
      data: {
        schoolId: user.schoolId,
        assetId: asset.id,
        issue: args.issue,
        priority: args.priority,
        assignedToId,
        reportedById: user.id,
        scheduledAt: args.scheduledAt || null,
        vendor: args.vendor || null,
        estimatedCost: args.estimatedCost == null ? null : String(args.estimatedCost),
      },
      select: { id: true },
    });

    if (args.observedCondition && args.observedCondition !== asset.condition) {
      await tx.assetItem.update({
        where: { id: asset.id },
        data: { condition: args.observedCondition },
      });
    }

    const status = assignedToId ? "ASSIGNED" : "FINDING";
    await tx.schoolFollowUpCase.create({
      data: {
        schoolId: user.schoolId,
        sourceType: "SARPRAS",
        sourceKey: `maintenance:${maintenance.id}`,
        sourceUrl: `/school/sarpras?maintenance=${maintenance.id}`,
        title: `Sarpras · ${asset.name}`,
        description: `${asset.code} · ${args.issue}`,
        severity: args.priority,
        status,
        assignedToId,
        createdById: user.id,
        dueAt: defaultFollowUpDueDate(args.priority),
        metadata: {
          maintenanceId: maintenance.id,
          assetId: asset.id,
          assetCode: asset.code,
        },
        events: {
          create: [
            {
              actorId: user.id,
              type: "CREATED",
              toStatus: status,
              note: "Tindak lanjut dibuat dari laporan pemeliharaan Sarpras.",
            },
            ...(assignedToId
              ? [{
                  actorId: user.id,
                  type: "ASSIGNED" as const,
                  toStatus: "ASSIGNED" as const,
                  note: "Penanggung jawab ditetapkan dari penugasan Sarpras.",
                  metadata: { assignedToId },
                }]
              : []),
          ],
        },
      },
    });

    return maintenance;
  });
};

const updateMaintenanceSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(ASSET_MAINTENANCE_STATUSES).optional(),
  priority: z.enum(FOLLOW_UP_SEVERITIES).optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  scheduledAt: z.coerce.date().optional().nullable(),
  vendor: z.string().trim().max(180).optional().nullable(),
  estimatedCost: z.coerce.number().min(0).max(999999999999).optional().nullable(),
  actualCost: z.coerce.number().min(0).max(999999999999).optional().nullable(),
  resolutionNote: z.string().trim().max(3000).optional().nullable(),
  assetCondition: z.enum(ASSET_CONDITIONS).optional(),
});

export const updateAssetMaintenance = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  await requireManage(user);
  const args = ensureArgsSchemaOrThrowHttpError(updateMaintenanceSchema, rawArgs);

  const current = await prisma.assetMaintenance.findFirst({
    where: { id: args.id, schoolId: user.schoolId },
    select: {
      id: true,
      status: true,
      assignedToId: true,
      assetId: true,
      issue: true,
    },
  });
  if (!current) throw new HttpError(404, "Pemeliharaan tidak ditemukan.");

  if (args.status && args.status !== current.status) {
    const allowed = nextMaintenanceStatuses(current.status as AssetMaintenanceStatusCode);
    if (!allowed.includes(args.status)) throw new HttpError(400, "Perubahan status pemeliharaan tidak sesuai alur.");
    if (args.status === "COMPLETED" && !args.resolutionNote?.trim()) {
      throw new HttpError(400, "Catatan penyelesaian wajib diisi sebelum pemeliharaan ditutup.");
    }
  }

  const assignedToId =
    args.assignedToId === undefined
      ? current.assignedToId
      : await ensureSchoolUserRef(user.schoolId, args.assignedToId);
  const nextStatus = args.status || current.status;
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.assetMaintenance.update({
      where: { id: current.id },
      data: {
        status: nextStatus,
        priority: args.priority || undefined,
        assignedToId: args.assignedToId === undefined ? undefined : assignedToId,
        scheduledAt: args.scheduledAt === undefined ? undefined : args.scheduledAt,
        vendor: args.vendor === undefined ? undefined : args.vendor || null,
        estimatedCost: args.estimatedCost === undefined ? undefined : args.estimatedCost == null ? null : String(args.estimatedCost),
        actualCost: args.actualCost === undefined ? undefined : args.actualCost == null ? null : String(args.actualCost),
        resolutionNote: args.resolutionNote === undefined ? undefined : args.resolutionNote || null,
        startedAt: nextStatus === "IN_PROGRESS" && current.status !== "IN_PROGRESS" ? now : undefined,
        completedAt: nextStatus === "COMPLETED" ? now : nextStatus === "IN_PROGRESS" ? null : undefined,
      },
      select: { id: true, status: true },
    });

    if (args.assetCondition) {
      await tx.assetItem.update({
        where: { id: current.assetId },
        data: { condition: args.assetCondition },
      });
    } else if (nextStatus === "IN_PROGRESS") {
      await tx.assetItem.update({
        where: { id: current.assetId },
        data: { condition: "MAINTENANCE" },
      });
    }

    const followUp = await tx.schoolFollowUpCase.findUnique({
      where: {
        schoolId_sourceType_sourceKey: {
          schoolId: user.schoolId,
          sourceType: "SARPRAS",
          sourceKey: `maintenance:${current.id}`,
        },
      },
      select: { id: true, status: true, assignedToId: true },
    });

    if (followUp) {
      const followStatus =
        nextStatus === "COMPLETED"
          ? "RESOLVED"
          : nextStatus === "CANCELED"
            ? "CANCELED"
            : nextStatus === "IN_PROGRESS"
              ? "IN_PROGRESS"
              : assignedToId
                ? "ASSIGNED"
                : "FINDING";

      await tx.schoolFollowUpCase.update({
        where: { id: followUp.id },
        data: {
          status: followStatus,
          assignedToId,
          severity: args.priority || undefined,
          resolutionNote: nextStatus === "COMPLETED" ? args.resolutionNote || null : undefined,
          resolvedAt: nextStatus === "COMPLETED" ? now : nextStatus === "IN_PROGRESS" ? null : undefined,
          resolvedById: nextStatus === "COMPLETED" ? user.id : nextStatus === "IN_PROGRESS" ? null : undefined,
        },
      });

      if (assignedToId !== followUp.assignedToId) {
        await tx.schoolFollowUpEvent.create({
          data: {
            caseId: followUp.id,
            actorId: user.id,
            type: "ASSIGNED",
            fromStatus: followUp.status,
            toStatus: followStatus,
            note: assignedToId ? "PIC pemeliharaan Sarpras diperbarui." : "PIC pemeliharaan Sarpras dilepas.",
            metadata: { assignedToId },
          },
        });
      }

      if (followStatus !== followUp.status) {
        await tx.schoolFollowUpEvent.create({
          data: {
            caseId: followUp.id,
            actorId: user.id,
            type: "STATUS_CHANGED",
            fromStatus: followUp.status,
            toStatus: followStatus,
            note: args.resolutionNote || `Status pemeliharaan: ${nextStatus}`,
          },
        });
      }
    }

    return updated;
  });
};

const moveAssetSchema = z.object({
  assetId: z.string().uuid(),
  toRoomId: z.string().uuid().optional().nullable(),
  type: z.enum(ASSET_MOVEMENT_TYPES).default("TRANSFER"),
  note: z.string().trim().max(2000).optional().nullable(),
});

export const moveAssetItem = async (rawArgs: unknown, context: { user?: User }) => {
  const user = ensureSchoolUser(context);
  await requireManage(user);
  const args = ensureArgsSchemaOrThrowHttpError(moveAssetSchema, rawArgs);

  const asset = await prisma.assetItem.findFirst({
    where: { id: args.assetId, schoolId: user.schoolId },
    select: { id: true, roomId: true, status: true },
  });
  if (!asset) throw new HttpError(404, "Aset tidak ditemukan.");
  const requestedRoomId = args.type === "DISPOSAL" ? null : args.toRoomId;
  const toRoomId = await ensureRoomRef(user.schoolId, requestedRoomId);
  if (asset.roomId === toRoomId && args.type === "TRANSFER") {
    throw new HttpError(400, "Aset sudah berada di ruang tersebut.");
  }

  return prisma.$transaction(async (tx) => {
    const movement = await tx.assetMovement.create({
      data: {
        schoolId: user.schoolId,
        assetId: asset.id,
        type: args.type,
        fromRoomId: asset.roomId,
        toRoomId,
        performedById: user.id,
        note: args.note || null,
      },
      select: { id: true },
    });

    await tx.assetItem.update({
      where: { id: asset.id },
      data: {
        roomId: toRoomId,
        ...(args.type === "DISPOSAL" ? { status: "DISPOSED" as const } : {}),
        ...(args.type === "REPAIR" ? { condition: "MAINTENANCE" as const } : {}),
      },
    });

    return movement;
  });
};
