import { expect, test } from "@playwright/test";

test.describe("landing page SaaS Satu", () => {
  test.beforeEach(async ({ page }) => page.goto("/"));

  test("menampilkan branding dan modul faktual", async ({ page }) => {
    await expect(page).toHaveTitle(/SaaS Satu Smart School/);
    await expect(page.getByRole("heading", { name: /Satu portal untuk data akademik/i })).toBeVisible();
    await expect(page.getByText("LMS dan CBT")).toBeVisible();
    await expect(page.getByText("E-PKL")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Multi-tenant" })).toBeVisible();
  });

  test("tidak memuat klaim atau harga template Open SaaS", async ({ page }) => {
    await expect(page.getByText(/Cool Feature|Mr\. Foobar|Wasp Mascot|\$9\.99|\$19\.99/i)).toHaveCount(0);
  });
});
