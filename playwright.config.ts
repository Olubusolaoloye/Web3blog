import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:${PORT}`, trace: "off" },
  projects: [{ name: "mobile-chrome", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `pnpm build && PORT=${PORT} pnpm start`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    // In-memory capture stores + /api/test-outbox; per-test client IPs via a test header.
    env: { E2E_TEST_MODE: "1", TRUSTED_IP_HEADER: "x-test-ip" },
    timeout: 180_000,
  },
});
