import { describe, expect, it } from "vitest";
import { companySchema } from "./companyPolicy";

describe("PKL company input validation", () => {
  it("accepts empty optional PIC fields as null together with geofence coordinates", () => {
    const result = companySchema.safeParse({
      code: "DEMO-PKL-01",
      name: "PT Demo PKL School OS",
      legalName: "PT Demo PKL School OS",
      industrySector: "Agribisnis / UAT",
      address: "Alamat DUDI Demo - khusus pengujian School OS",
      phone: null,
      email: null,
      website: null,
      picName: null,
      picPhone: null,
      latitude: -7.004497520015701,
      longitude: 107.26621246005183,
      radiusMeters: 100,
      maxQuota: 1,
      partnershipStatus: "ACTIVE",
      partnershipStartDate: "2026-09-21",
      partnershipEndDate: null,
      mouNumber: null,
      notes: "[DEMO] Mitra PKL sementara untuk pengujian langsung PKL Gen 2.",
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it("accepts a null optional industry sector", () => {
    const result = companySchema.safeParse({
      name: "Mitra tanpa sektor",
      industrySector: null,
      address: "Alamat mitra",
      picName: null,
      picPhone: null,
      radiusMeters: 100,
      maxQuota: 1,
      partnershipStatus: "ACTIVE",
      isActive: true,
    });

    expect(result.success).toBe(true);
  });
});
