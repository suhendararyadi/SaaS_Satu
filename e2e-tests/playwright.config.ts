import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command:
        "cd ../app/.wasp/out/server && NODE_ENV=development SKIP_EMAIL_VERIFICATION_IN_DEV=true PORT=3001 WASP_WEB_CLIENT_URL=http://localhost:3000 WASP_SERVER_URL=http://localhost:3001 npm run start",
      url: "http://localhost:3001",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command:
        "cd ../app && NODE_ENV=development REACT_APP_API_URL=http://localhost:3001 npx vite --host 127.0.0.1 --port 3000",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
