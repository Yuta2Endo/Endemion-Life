import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadRootEnv } from "../src/config.js";

/** Перед тестами API: миграции на тестовую базу. Рабочую базу тесты не трогают */
export default function setup(): void {
  loadRootEnv();
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("Задайте DATABASE_URL_TEST в .env: тесты API работают на отдельной базе");
  if (url === process.env.DATABASE_URL) throw new Error("DATABASE_URL_TEST совпадает с DATABASE_URL: тесты очищают базу, нужна отдельная");
  const cwd = fileURLToPath(new URL("../../../packages/database", import.meta.url));
  execSync("pnpm exec prisma migrate deploy", { cwd, stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}
