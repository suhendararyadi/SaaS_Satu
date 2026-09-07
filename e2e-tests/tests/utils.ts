import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { randomUUID } from "crypto";

export type TestUser = { email: string; password: string };

export function createRandomUser(): TestUser {
  return {
    email: `e2e-${randomUUID()}@example.test`,
    password: `Aman-${randomUUID()}!9a`,
  };
}

export async function signUp(page: Page, user: TestUser) {
  await page.goto("/signup");
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/auth/email/signup") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /sign up/i }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
}

export async function logIn(page: Page, user: TestUser) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/auth/email/login") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /log in/i }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  await page.waitForURL("**/school");
}

export async function createLoggedInContext(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const user = createRandomUser();
  await signUp(page, user);
  await logIn(page, user);
  return { context, page, user } as { context: BrowserContext; page: Page; user: TestUser };
}

export async function registerSchool(page: Page, schoolName: string) {
  await page.goto("/school");
  await expect(page.getByText("Setup Unit Sekolah Anda")).toBeVisible({ timeout: 20000 });
  await page.getByLabel("Nama Sekolah *").fill(schoolName);
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/operations/register-school") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Daftarkan Sekolah Saya" }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  await expect(page.getByText(schoolName).first()).toBeVisible();
}

export async function createDepartment(page: Page, code: string, name: string): Promise<string> {
  await page.goto("/school/departments");
  await page.getByRole("button", { name: "Tambah Jurusan" }).click();
  await page.getByLabel("Kode Jurusan *").fill(code);
  await page.getByLabel("Nama Lengkap Jurusan *").fill(name);
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/operations/create-department") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Simpan Jurusan" }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { json?: { id?: string } };
  const id = payload.json?.id;
  if (!id) throw new Error("Create department response did not contain an id");
  await expect(page.getByText(name)).toBeVisible();
  return id;
}

export async function callOperation(
  page: Page,
  path: string,
  args: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
  return page.evaluate(
    async ({ operationPath, operationArgs }) => {
      const sessionValue = localStorage.getItem("wasp:sessionId");
      const sessionId = sessionValue ? JSON.parse(sessionValue) : null;
      const response = await fetch(`/operations/${operationPath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionId ? { Authorization: `Bearer ${sessionId}` } : {}),
        },
        body: JSON.stringify({ json: operationArgs }),
      });
      const rawBody = await response.text();
      let body: unknown = rawBody;
      try {
        body = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        // Keep non-JSON error responses as plain text.
      }
      return { status: response.status, body };
    },
    { operationPath: path, operationArgs: args },
  );
}
