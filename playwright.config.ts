import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: "http://localhost:3001",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    contextOptions: { reducedMotion: "reduce" },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm start -- --hostname 127.0.0.1 --port 3001",
    url: "http://localhost:3001",
    reuseExistingServer: false,
    env: {
      SESSION_SECRET: "e2e-only-session-secret-not-for-production-1234",
      EXPERIENCE_KEY: "e2e-only-qr-key-not-for-production-123456789",
      ADMIN_PASSWORD: "e2e-only-admin-password",
    },
  },
});
