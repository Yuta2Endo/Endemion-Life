import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Модульные тесты сайта (без браузера). Браузерные сценарии — в e2e (Playwright)
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node"
  }
});
