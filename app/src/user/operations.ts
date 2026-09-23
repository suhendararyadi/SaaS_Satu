import { type Prisma } from "@prisma/client";
import { type User } from "wasp/entities";
import { HttpError, prisma } from "wasp/server";
import {
  type GetPaginatedUsers,
  type UpdateIsUserAdminById,
} from "wasp/server/operations";
import * as z from "zod";
import { SubscriptionStatus } from "../payment/plans";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

const updateUserAdminByIdInputSchema = z.object({
  id: z.string().nonempty(),
  isAdmin: z.boolean(),
});

type UpdateUserAdminByIdInput = z.infer<typeof updateUserAdminByIdInputSchema>;

export const updateIsUserAdminById: UpdateIsUserAdminById<
  UpdateUserAdminByIdInput,
  User
> = async (rawArgs, context) => {
  const { id, isAdmin } = ensureArgsSchemaOrThrowHttpError(
    updateUserAdminByIdInputSchema,
    rawArgs,
  );

  if (!context.user) {
    throw new HttpError(
      401,
      "Only authenticated users are allowed to perform this operation",
    );
  }

  if (!context.user.isAdmin) {
    throw new HttpError(
      403,
      "Only admins are allowed to perform this operation",
    );
  }

  return context.entities.User.update({
    where: { id },
    data: { isAdmin },
  });
};

type GetPaginatedUsersOutput = {
  users: Pick<
    User,
    | "id"
    | "email"
    | "username"
    | "subscriptionStatus"
    | "paymentProcessorUserId"
    | "isAdmin"
  >[];
  totalPages: number;
};

const getPaginatorArgsSchema = z.object({
  skipPages: z.number(),
  filter: z.object({
    emailContains: z.string().nonempty().optional(),
    isAdmin: z.boolean().optional(),
    subscriptionStatusIn: z
      .array(z.nativeEnum(SubscriptionStatus).nullable())
      .optional(),
  }),
});

type GetPaginatedUsersInput = z.infer<typeof getPaginatorArgsSchema>;

export const getPaginatedUsers: GetPaginatedUsers<
  GetPaginatedUsersInput,
  GetPaginatedUsersOutput
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(
      401,
      "Only authenticated users are allowed to perform this operation",
    );
  }

  if (!context.user.isAdmin) {
    throw new HttpError(
      403,
      "Only admins are allowed to perform this operation",
    );
  }

  const {
    skipPages,
    filter: {
      subscriptionStatusIn: subscriptionStatus,
      emailContains,
      isAdmin,
    },
  } = ensureArgsSchemaOrThrowHttpError(getPaginatorArgsSchema, rawArgs);

  const includeUnsubscribedUsers = !!subscriptionStatus?.some(
    (status) => status === null,
  );
  const desiredSubscriptionStatuses = subscriptionStatus?.filter(
    (status) => status !== null,
  );

  const pageSize = 10;

  const userPageQuery: Prisma.UserFindManyArgs = {
    skip: skipPages * pageSize,
    take: pageSize,
    where: {
      AND: [
        {
          email: {
            contains: emailContains,
            mode: "insensitive",
          },
          isAdmin,
        },
        {
          OR: [
            {
              subscriptionStatus: {
                in: desiredSubscriptionStatuses,
              },
            },
            {
              subscriptionStatus: includeUnsubscribedUsers ? null : undefined,
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      email: true,
      username: true,
      isAdmin: true,
      subscriptionStatus: true,
      paymentProcessorUserId: true,
    },
    orderBy: {
      username: "asc",
    },
  };

  const [pageOfUsers, totalUsers] = await prisma.$transaction([
    context.entities.User.findMany(userPageQuery),
    context.entities.User.count({ where: userPageQuery.where }),
  ]);
  const totalPages = Math.ceil(totalUsers / pageSize);

  return {
    users: pageOfUsers,
    totalPages,
  };
};

export const getMyStudentAccountProfile = async (
  _args: unknown,
  context: { user?: User },
) => {
  const currentUser = context.user;
  if (!currentUser) {
    throw new HttpError(401, "Anda harus login untuk melihat profil siswa.");
  }
  if (currentUser.role !== "STUDENT" || !currentUser.schoolId) {
    throw new HttpError(403, "Profil peserta didik hanya tersedia untuk akun siswa sekolah.");
  }

  const student = await prisma.user.findFirst({
    where: {
      id: currentUser.id,
      schoolId: currentUser.schoolId,
      role: "STUDENT",
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      school: {
        select: {
          id: true,
          name: true,
          npsn: true,
          city: true,
          province: true,
          logoUrl: true,
        },
      },
      classRoom: {
        select: {
          id: true,
          name: true,
          department: { select: { code: true, name: true } },
          academicYear: {
            select: {
              id: true,
              yearName: true,
              semester: true,
              isActive: true,
            },
          },
        },
      },
      studentProfile: {
        select: {
          nis: true,
          nisn: true,
          gender: true,
          birthPlace: true,
          birthDate: true,
          religion: true,
          status: true,
          address: true,
          rt: true,
          rw: true,
          hamlet: true,
          village: true,
          district: true,
          postalCode: true,
          residenceType: true,
          transportation: true,
          phone: true,
          mobilePhone: true,
          previousSchool: true,
          fatherName: true,
          motherName: true,
          guardianName: true,
          dapodikImportedAt: true,
        },
      },
    },
  });

  if (!student) {
    throw new HttpError(404, "Profil peserta didik tidak ditemukan pada unit sekolah aktif.");
  }

  return { student };
};
