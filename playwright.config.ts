import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  reporter: "line",
  outputDir: "test-results",
  use: {
    baseURL: process.env.SMOKE_BASE || "http://127.0.0.1:43123",
    screenshot: "off",
    video: "off",
    trace: "off",
  },
});
