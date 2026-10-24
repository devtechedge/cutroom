import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: process.env.PROD_URL ?? "https://cutroom-green.vercel.app",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
