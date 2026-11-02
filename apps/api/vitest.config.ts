import { defineConfig } from "vitest/config";

// Модульные тесты API без базы данных
export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    environment: "node"
  }
});
