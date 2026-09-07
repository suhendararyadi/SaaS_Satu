import { expect, test } from "@playwright/test";

test("pricing tidak menampilkan harga contoh saat payment belum dikonfigurasi", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText("Pembayaran online belum diaktifkan")).toBeVisible();
  await expect(page.getByText(/\$9\.99|4242 4242/i)).toHaveCount(0);
});
