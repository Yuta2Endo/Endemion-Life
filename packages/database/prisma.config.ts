// Настройки Prisma CLI. Адрес базы берётся из .env в корне проекта (или из окружения)
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const rootEnv = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(rootEnv)) {
  // Переменные окружения процесса важнее файла: так тесты направляют миграции в тестовую базу
  const before = { ...process.env };
  process.loadEnvFile(rootEnv);
  Object.assign(process.env, before);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // prisma generate адрес не нужен: заглушка позволяет собрать клиент без базы (например, в Docker)
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/endemion_life",
    // Пустая служебная база для `prisma migrate diff --from-migrations` (проверка, что миграции совпадают со схемой).
    // Нужна только в CI и при разработке миграций; рабочей среде не нужна
    ...(process.env.SHADOW_DATABASE_URL ? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL } : {})
  }
});
