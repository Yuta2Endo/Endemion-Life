// Браузерные сценарии: pnpm test:e2e. Нужны запущенные PostgreSQL и Redis (pnpm infra:up) и собранный проект (pnpm build).
// Браузер ставится один раз: pnpm --filter @endemion/web exec playwright install chromium
import { defineConfig, devices } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE,
    reducedMotion: "reduce",
    trace: "retain-on-failure"
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: "pnpm --filter @endemion/api start",
          url: "http://127.0.0.1:4000/api/health",
          cwd: "../..",
          reuseExistingServer: true,
          timeout: 60_000,
          // Все браузеры тестов приходят с одного адреса: общий лимит (120 в минуту) и лимит входа (10 в минуту)
          // подняты только для тестового сервера. Сами лимиты проверяются в тестах API.
          // Письма пишутся в .mail-outbox: из него тесты берут коды подтверждения
          env: { RATE_LIMIT_PER_MINUTE: "5000", AUTH_RATE_LIMIT_PER_MINUTE: "500", MAIL_DRIVER: "file" }
        },
        {
          command: "pnpm --filter @endemion/web start",
          url: "http://localhost:3000",
          cwd: "../..",
          reuseExistingServer: true,
          timeout: 60_000
        }
      ]
});
