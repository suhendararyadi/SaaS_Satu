import { expect, test } from "@playwright/test";
import { createLoggedInContext } from "./utils";

test("pengguna yang sudah login dialihkan dari login/signup ke portal sekolah", async ({ browser }) => {
  const { context, page } = await createLoggedInContext(browser);
  await page.goto("/login");
  await page.waitForURL("**/school");
  await page.goto("/signup");
  await page.waitForURL("**/school");
  expect(page.url()).toContain("/school");
  await context.close();
});
