import { expect, test } from "@playwright/test";
import {
  callOperation,
  createDepartment,
  createLoggedInContext,
  registerSchool,
} from "./utils";

test("tenant A dan tenant B tidak dapat membaca atau mengubah data satu sama lain", async ({ browser }) => {
  const tenantA = await createLoggedInContext(browser);
  const tenantB = await createLoggedInContext(browser);

  const suffix = Date.now().toString();
  const schoolA = `Sekolah A ${suffix}`;
  const schoolB = `Sekolah B ${suffix}`;
  const deptA = `Keahlian A ${suffix}`;
  const deptB = `Keahlian B ${suffix}`;

  await registerSchool(tenantA.page, schoolA);
  const departmentAId = await createDepartment(tenantA.page, "TA", deptA);

  await registerSchool(tenantB.page, schoolB);
  await createDepartment(tenantB.page, "TB", deptB);

  await tenantB.page.goto("/school/departments");
  await expect(tenantB.page.getByText(deptB)).toBeVisible();
  await expect(tenantB.page.getByText(deptA)).toHaveCount(0);

  const crossTenantWrite = await callOperation(tenantB.page, "update-department", {
    id: departmentAId,
    code: "XTA",
    name: "Tidak boleh berubah",
  });
  expect([403, 404]).toContain(crossTenantWrite.status);

  await tenantA.page.goto("/school/departments");
  await expect(tenantA.page.getByText(deptA)).toBeVisible();
  await expect(tenantA.page.getByText("Tidak boleh berubah")).toHaveCount(0);
  await expect(tenantA.page.getByText(deptB)).toHaveCount(0);

  await tenantA.context.close();
  await tenantB.context.close();
});
