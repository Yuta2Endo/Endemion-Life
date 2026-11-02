import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

export * from "./generated/prisma/client.js";

export interface DatabaseOptions {
  url: string;
  /** Размер пула соединений */
  max?: number;
}

/** Клиент PostgreSQL через драйвер pg. Один на процесс: соединения переиспользуются */
export function createPrismaClient({ url, max = 10 }: DatabaseOptions): PrismaClient {
  const adapter = new PrismaPg({ connectionString: url, max });
  return new PrismaClient({ adapter });
}
