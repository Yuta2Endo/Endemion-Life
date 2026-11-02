import { defineConfig } from "vitest/config";

// Тесты API на настоящей PostgreSQL: отдельная база DATABASE_URL_TEST, схема ставится миграциями перед запуском
export default defineConfig({
  test: {
    include: ["test/**/*.e2e-spec.ts"],
    environment: "node",
    globalSetup: ["./test/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000
  }
});
