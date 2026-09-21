import * as z from "zod";
import { PKL_PARTNERSHIP_STATUSES } from "./foundationPolicy";

export const companySchema = z.object({
  code: z.string().trim().max(40).optional().nullable(),
  name: z.string().min(2, "Nama perusahaan minimal 2 karakter"),
  legalName: z.string().trim().max(240).optional().nullable(),
  industrySector: z.string().optional().nullable(),
  address: z.string().min(3, "Alamat wajib diisi"),
  phone: z.string().trim().max(80).optional().nullable(),
  email: z.string().trim().email("Format email mitra tidak valid").max(320).optional().nullable().or(z.literal("")),
  website: z.string().trim().url("Format website harus URL lengkap").max(500).optional().nullable().or(z.literal("")),
  picName: z.string().optional().nullable(),
  picPhone: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  radiusMeters: z.number().int().min(10).max(5000).default(100),
  maxQuota: z.number().int().min(1).default(5),
  partnershipStatus: z.enum(PKL_PARTNERSHIP_STATUSES).default("ACTIVE"),
  partnershipStartDate: z.string().optional().nullable(),
  partnershipEndDate: z.string().optional().nullable(),
  mouNumber: z.string().trim().max(160).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  isActive: z.boolean().default(true),
});
