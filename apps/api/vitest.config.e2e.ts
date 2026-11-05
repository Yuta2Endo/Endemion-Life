import { defineConfig } from "vitest/config";

// Тесты API на настоящей PostgreSQL: отдельная база DATABASE_URL_TEST, схема ставится миграциями перед запуском
export default defineConfig({
  test: {
    include: ["test/**/*.e2e-spec.ts"],
    environment: "node",
    globalSetup: ["./test/global-setup.ts"],
    fileParallelism: false,
    // Все файлы делят одну тестовую базу и чистят её через TRUNCATE. Второй воркер ловит чужой сброс.
    maxWorkers: 1,
    minWorkers: 1,
    testTimeout: 30_000,
    hookTimeout: 120_000
  }
});
